import "dotenv/config";
import fetch from "node-fetch";
import { Client } from "@notionhq/client";

// Initialize clients and constants from environment variables
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const tmdbToken = process.env.TMDB_TOKEN;
const databaseId = process.env.NOTION_DB_ID;

/**
 * Utility to check that required environment variables are set.
 */
function assertEnv() {
  if (!process.env.NOTION_TOKEN || !databaseId || !tmdbToken) {
    throw new Error("Missing required environment variables (NOTION_TOKEN, NOTION_DB_ID, TMDB_TOKEN)");
  }
}

/**
 * TMDB: Search for a movie or TV show.
 */
async function tmdbSearchTitle(title) {
  assertEnv();
  const url = `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(
    title
  )}&api_key=${tmdbToken}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB search failed with status: ${res.status}`);
  const data = await res.json();
  return data.results[0];
}

/**
 * TMDB: Get full details for a specific item.
 */
async function tmdbGetDetails(type, id) {
  assertEnv();
  const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${tmdbToken}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB detail fetch failed with status: ${res.status}`);
  return await res.json();
}

/**
 * TMDB: Get streaming providers for a title
 */
async function tmdbGetProviders(type, id) {
  assertEnv();
  // Note: This fetches providers for the US market. You can change 'US' to your country code.
  const url = `https://api.themoviedb.org/3/${type}/${id}/watch/providers?api_key=${tmdbToken}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`Could not fetch providers for ${type} ${id}.`);
    return [];
  }
  const data = await res.json();
  const providers = data.results?.US?.flatrate || [];
  return providers.map(p => ({ name: p.provider_name }));
}

/**
 * Maps TMDB data to Notion database properties.
 */
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

/**
 * Finds an item in the Notion database by its TMDB ID or title.
 */
export async function notionFindByTmdbOrTitle(tmdbId, title) {
  assertEnv();
  const filterConditions = [];
  if (tmdbId) {
    filterConditions.push({ property: "TMDB_ID", rich_text: { equals: String(tmdbId) } });
  }
  if (title) {
    filterConditions.push({ property: "Title", title: { equals: title } });
  }
  if (filterConditions.length === 0) return [];

  const response = await notion.databases.query({
    database_id: databaseId,
    filter: { or: filterConditions },
  });
  return response.results;
}

/**
 * Creates a new page in the Notion database.
 */
export async function notionCreatePage(properties) {
  assertEnv();
  return await notion.pages.create({
    parent: { database_id: databaseId },
    properties,
  });
}

/**
 * Updates an existing Notion page's properties.
 */
export async function notionUpdatePage(pageId, properties) {
  assertEnv();
  return await notion.pages.update({ page_id: pageId, properties });
}

/**
 * Appends an image block to a Notion page.
 */
export async function notionAppendPosterImage(pageId, imageUrl) {
  assertEnv();
  await notion.blocks.children.append({
    block_id: pageId,
    children: [{ object: "block", type: "image", image: { external: { url: imageUrl } } }],
  });
}

/**
 * The main sync function: searches TMDB, then creates or updates the entry in Notion.
 */
export async function syncOne(title) {
  assertEnv();
  const searchResult = await tmdbSearchTitle(title);
  if (!searchResult) throw new Error(`No results found for "${title}" on TMDB.`);

  const mediaType = searchResult.media_type;
  if (mediaType !== 'movie' && mediaType !== 'tv') {
    throw new Error(`Found result for "${title}", but it is not a movie or TV show.`);
  }

  const [details, providers] = await Promise.all([
    tmdbGetDetails(mediaType, searchResult.id),
    tmdbGetProviders(mediaType, searchResult.id)
  ]);
  
  const props = mapToNotionProperties(details, mediaType, providers);

  const existingPages = await notionFindByTmdbOrTitle(details.id, null);
  let page;

  if (existingPages.length > 0) {
    page = await notionUpdatePage(existingPages[0].id, props);
    console.log(`✅ Updated existing entry: ${title}`);
  } else {
    page = await notionCreatePage(props);
    console.log(`🆕 Created new entry: ${title}`);
  }

  if (details.backdrop_path) {
    await notionAppendPosterImage(page.id, `https://image.tmdb.org/t/p/w1280${details.backdrop_path}`);
  }
}
