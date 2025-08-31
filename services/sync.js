import {
  tmdbSearchTitle,
  tmdbGetDetails,
  tmdbGetProviders,
} from "./tmdb.js";
import {
  notionFindByTmdbOrTitle,
  notionCreatePage,
  notionUpdatePage,
  notionAppendImage,
} from "./notion.js";

// This function remains the same
function mapToNotionProperties(details, type, providers) {
    const props = {
      "Title": { title: [{ text: { content: details.title || details.name } }] },
      "Format": { select: { name: type === 'tv' ? 'TV Show' : 'Movie' } },
      "IMDB": { number: details.vote_average ? Number(details.vote_average.toFixed(1)) : null },
      "TMDB_ID": { rich_text: [{ text: { content: String(details.id) } }] },
      "Status": { select: { name: "🧡 To Watch" } },
      "Year": { number: new Date(details.release_date || details.first_air_date).getFullYear() || null },
      "Genre": { multi_select: details.genres ? details.genres.map(g => ({ name: g.name })) : [] },
    };
    if (type === 'tv') {
      props["Seasons"] = { number: details.number_of_seasons || null };
      props["Total Eps"] = { number: details.number_of_episodes || null };
    }
    if (providers && providers.length > 0) {
      props["Platform"] = { select: providers[0] };
    }
    return props;
}

// --- THIS FUNCTION IS UPDATED ---
export async function syncOne(title) {
  const searchResult = await tmdbSearchTitle(title);
  if (!searchResult) throw new Error(`No results found for "${title}" on TMDB.`);

  const mediaType = searchResult.media_type;
  if (mediaType !== 'movie' && mediaType !== 'tv') {
    throw new Error(`Found result for "${title}", but it's not a movie or TV show.`);
  }

  const [details, providers] = await Promise.all([
    tmdbGetDetails(mediaType, searchResult.id),
    tmdbGetProviders(mediaType, searchResult.id),
  ]);

  const props = mapToNotionProperties(details, mediaType, providers);
  const existingPages = await notionFindByTmdbOrTitle(details.id, details.title || details.name);
  
  if (existingPages.length > 0) {
    // If it exists, update it...
    await notionUpdatePage(existingPages[0].id, props);
    console.log(`✅ Updated existing entry: ${title}`);
    // ...and report back that it was an UPDATE.
    return 'updated';
  } else {
    // If it's new, create it...
    const newPage = await notionCreatePage(props);
    console.log(`🆕 Created new entry: ${title}`);
    
    // ...and ONLY add the image for new entries.
    if (details.backdrop_path) {
      await notionAppendImage(newPage.id, `https://image.tmdb.org/t/p/w1280${details.backdrop_path}`);
    }
    // Report back that it was CREATED.
    return 'created';
  }
}