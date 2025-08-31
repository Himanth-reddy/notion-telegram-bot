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
 * Searches for a movie or TV show on TMDB.
 * @param {string} title The title to search for.
 * @returns {Promise<object>} The first search result from TMDB.
 */
async function tmdbSearchTitle(title) {
  assertEnv();
  const url = `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(
    title
  )}&api_key=${tmdbToken}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB search failed with status: ${res.status}`);
  const data = await res.json();
  return data.results[0]; // Return the top result
}

/**
 * Gets full details for a specific TMDB item.
 * @param {string} type 'movie' or 'tv'.
 * @param {number} id The TMDB ID.
 * @returns {Promise<object>} Full details of the item.
 */
async function tmdbGetDetails(type, id) {
  assertEnv();
  const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${tmdbToken}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB detail fetch failed with status: ${res.status}`);
  return await res.json();
}

/**
 * Maps TMDB data to Notion database properties.
 * @param {object} details The full TMDB details object.
 * @param {string} type 'movie' or 'tv'.
 * @returns {object} A Notion properties object.
 */
function mapToNotionProperties(details, type) {
  return {
    Name: { title: [{ text: { content: details.title || details.name } }] },
    TMDB_ID: { rich_text: [{ text: { content: String(details.id) } }] },
    Type: { select: { name: type === 'tv' ? '📺 TV Show' : '🎬 Movie' } },
    Status: { select: { name: "🧡 To Watch" } }, // Default status
    Rating: { number: details.vote_average ? Number(details.vote_average.toFixed(1)) : null },
    ReleaseDate: {
      date: { start: details.release_date || details.first_air_date || null },
    },
    Year: { number: new Date(details.release_date || details.first_air_date).getFullYear() || null },
  };
}

/**
 * Finds an item in the Notion database by its TMDB ID or title.
 * @param {string | null} tmdbId The TMDB ID to search for.
 * @param {string | null} title The title to search for.
 * @returns {Promise<Array>} An array of matching Notion pages.
 */
export async function notionFindByTmdbOrTitle(tmdbId, title) {
  assertEnv();
  const filterConditions = [];

  if (tmdbId) {
    filterConditions.push({ property: "TMDB_ID", rich_text: { equals: String(tmdbId) } });
  }
  if (title) {
    // Note: Notion API title filters are case-sensitive.
    filterConditions.push({ property: "Name", title: { equals: title } });
  }

  if (filterConditions.length === 0) return [];

  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      or: filterConditions,
    },
  });
  return response.results;
}

/**
 * Creates a new page in the Notion database.
 * @param {object} properties The properties for the new page.
 * @returns {Promise<object>} The created Notion page object.
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
 * @param {string} pageId The ID of the page to update.
 * @param {object} properties The properties to update.
 * @returns {Promise<object>} The updated Notion page object.
 */
export async function notionUpdatePage(pageId, properties) {
  assertEnv();
  return await notion.pages.update({ page_id: pageId, properties });
}

/**
 * Appends a poster image block to a Notion page.
 * @param {string} pageId The ID of the page to add the image to.
 * @param {string} imageUrl The URL of the poster image.
 */
export async function notionAppendPosterImage(pageId, imageUrl) {
  assertEnv();
  await notion.blocks.children.append({
    block_id: pageId,
    children: [
      { object: "block", type: "image", image: { external: { url: imageUrl } } },
    ],
  });
}

/**
 * The main sync function: searches TMDB, then creates or updates the entry in Notion.
 * @param {string} title The title of the movie/show to sync.
 */
export async function syncOne(title) {
  assertEnv();
  const searchResult = await tmdbSearchTitle(title);
  if (!searchResult) throw new Error(`No results found for "${title}" on TMDB.`);

  const mediaType = searchResult.media_type;
  if (mediaType !== 'movie' && mediaType !== 'tv') {
    throw new Error(`Found result for "${title}", but it is not a movie or TV show.`);
  }

  const details = await tmdbGetDetails(mediaType, searchResult.id);
  const props = mapToNotionProperties(details, mediaType);

  const existingPages = await notionFindByTmdbOrTitle(details.id, null);
  let page;

  if (existingPages.length > 0) {
    // Item already exists, update it
    page = await notionUpdatePage(existingPages[0].id, props);
    console.log(`✅ Updated existing entry: ${title}`);
  } else {
    // Item is new, create it
    page = await notionCreatePage(props);
    console.log(`🆕 Created new entry: ${title}`);
  }

  // Add the poster image if it exists
  if (details.poster_path) {
    await notionAppendPosterImage(page.id, `https://image.tmdb.org/t/p/w500${details.poster_path}`);
  }
}
