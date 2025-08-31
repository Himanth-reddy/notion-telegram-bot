// Node 18+ (global fetch). Upserts TMDB metadata into a Notion database, de-duping by TMDB ID,
// and appends the TMDB poster as an image block inside the page.

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_DB_ID = process.env.NOTION_DB_ID;
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const NOTION_VERSION = '2022-06-28';

function assertEnv() {
  const missing = [];
  if (!NOTION_TOKEN) missing.push('NOTION_TOKEN');
  if (!NOTION_DB_ID) missing.push('NOTION_DB_ID');
  if (!TMDB_API_KEY) missing.push('TMDB_API_KEY');
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}`);
}

// TMDB search (movie/tv) exact-first, else first hit
async function tmdbSearchTitle(title) {
  const url = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&include_adult=false`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(`TMDB search error ${res.status}: ${JSON.stringify(data)}`);
  const results = Array.isArray(data.results) ? data.results : [];
  const exact = results.find(r =>
    (r.media_type === 'movie' && (r.title || '').toLowerCase() === title.toLowerCase()) ||
    (r.media_type === 'tv' && (r.name || '').toLowerCase() === title.toLowerCase())
  );
  return exact || results.find(r => r.media_type === 'movie' || r.media_type === 'tv') || null;
}

// TMDB details with external_ids and networks
async function tmdbGetDetails(mediaType, id) {
  const url = `https://api.themoviedb.org/3/${mediaType}/${id}?api_key=${TMDB_API_KEY}&append_to_response=external_ids,networks`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(`TMDB detail error ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

// Build Notion properties and poster URL (do NOT include Status so user controls it)
function mapToNotionProperties(details, mediaType) {
  const title = details.title || details.name || '';
  const tmdbId = details.id;
  const genres = (details.genres || []).map(g => g.name);
  const dateStr = details.release_date || details.first_air_date || '';
  const year = dateStr ? parseInt(dateStr.slice(0, 4), 10) : null;
  const platformNames = Array.isArray(details.networks) ? details.networks.map(n => n.name) : [];
  const imdbNumber = typeof details.vote_average === 'number'
    ? Math.round(details.vote_average * 10) / 10
    : null;
  const seasons = details.number_of_seasons || 0;
  const totalEps = details.number_of_episodes || 0;
  const format = mediaType === 'tv' ? 'TV Show' : 'Movie';

  // ✅ Fixed poster URL logic
  const posterUrl = details.poster_path
    ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
    : details.backdrop_path
      ? `https://image.tmdb.org/t/p/w500${details.backdrop_path}`
      : null;

  const props = {
    Title: { title: [{ text: { content: title } }] },
    'TMDB ID': { number: tmdbId },
    Genre: { multi_select: genres.map(name => ({ name })) },
    Year: { number: Number.isFinite(year) ? year : null },
    Platform: platformNames.length
      ? { multi_select: platformNames.map(name => ({ name })) }
      : { multi_select: [] },
    Tags: { multi_select: [] },
    Format: { select: { name: format } },
    IMDb: { number: imdbNumber },
    Seasons: { number: seasons },
    'Total Eps': { number: totalEps }
  };

  return { props, posterUrl, canonicalTitle: title, tmdbId };
}

// Find existing page by TMDB ID (Number) first, then Title (equals, then contains)
async function notionFindByTmdbOrTitle(tmdbId, title) {
  if (Number.isFinite(tmdbId)) {
    let res = await fetch(`https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ filter: { property: 'TMDB ID', number: { equals: tmdbId } }, page_size: 1 })
    });
    let data = await res.json();
    if (!res.ok) throw new Error(`Notion query error ${res.status}: ${JSON.stringify(data)}`);
    if (data.results?.length) return data.results;
  }
  // Title equals
  let res = await fetch(`https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ filter: { property: 'Title', title: { equals: title } }, page_size: 1 })
  });
  let data = await res.json();
  if (!res.ok) throw new Error(`Notion query error ${res.status}: ${JSON.stringify(data)}`);
  if (data.results?.length) return data.results;

  // Title contains
  res = await fetch(`https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ filter: { property: 'Title', title: { contains: title } }, page_size: 1 })
  });
  data = await res.json();
  if (!res.ok) throw new Error(`Notion query error ${res.status}: ${JSON.stringify(data)}`);
  return (data.results && data.results) || null;
}

// Create page with default Status = "To Watch"
async function notionCreatePage(properties) {
  const propsForCreate = { ...properties, Status: { select: { name: '🧡 To Watch' } } };
  const body = { parent: { database_id: NOTION_DB_ID }, properties: propsForCreate };
  const res = await fetch(`https://api.notion.com/v1/pages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Notion create error: ${res.status} ${JSON.stringify(data)}`);
  return data; // includes page.id
}

// Update page properties (Status not included to preserve user edits)
async function notionUpdatePage(pageId, properties) {
  if (!pageId) throw new Error('Cannot update Notion page: pageId is undefined');
  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ properties })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Notion update error: ${res.status} ${JSON.stringify(data)}`);
  return data;
}

// Append poster image only if not already present
async function notionAppendPosterImage(pageId, posterUrl) {
  if (!posterUrl) return;

  // Get existing children
  const resChildren = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`, {
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': NOTION_VERSION
    }
  });
  const dataChildren = await resChildren.json();

  const alreadyHasPoster = dataChildren.results?.some(
    b => b.type === 'image' && b.image?.external?.url === posterUrl
  );

  if (alreadyHasPoster) return; // don’t append duplicate

  const res = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      children: [
        {
          object: 'block',
          type: 'image',
          image: { type: 'external', external: { url: posterUrl } }
        }
      ]
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Append image error: ${res.status} ${JSON.stringify(data)}`);
  return data;
}

// Orchestrate one title: TMDB -> map -> find -> update or create -> append image
async function syncOne(titleInput) {
  console.log(`\n==> Processing: ${titleInput}`);
  const hit = await tmdbSearchTitle(titleInput);
  if (!hit) { console.warn(`No TMDB result for "${titleInput}"`); return; }
  const details = await tmdbGetDetails(hit.media_type, hit.id);
  const { props, posterUrl, canonicalTitle, tmdbId } = mapToNotionProperties(details, hit.media_type);

  const existing = await notionFindByTmdbOrTitle(tmdbId, canonicalTitle);

  if (existing && existing.length > 0) {
    const pageId = existing[0].id;
    await notionUpdatePage(pageId, props);
    console.log(`Updated: ${canonicalTitle} (${pageId})`);
    await notionAppendPosterImage(pageId, posterUrl);
  } else {
    const created = await notionCreatePage(props);
    console.log(`Created: ${canonicalTitle} (${created.id})`);
    await notionAppendPosterImage(created.id, posterUrl);
  }
}

// CLI entry
(async () => {
  try {
    assertEnv();
    const titles = process.argv.slice(2);
    if (titles.length === 0) {
      console.log('Usage: node sync_tmdb_to_notion.js "Gravity" "Chernobyl" "The Office"');
      process.exit(0);
    }
    for (const t of titles) {
      try { await syncOne(t); }
      catch (e) { console.error(`Error on "${t}":`, e.message); }
    }
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
})();
