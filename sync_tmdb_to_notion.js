import "dotenv/config";
import fetch from "node-fetch";
import pkg from "@notionhq/client";
const { Client } = pkg;

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const tmdbToken = process.env.TMDB_TOKEN;
const databaseId = process.env.NOTION_DB_ID;

/**
 * Utility to check required env vars.
 */
function assertEnv() {
  if (!process.env.NOTION_TOKEN) throw new Error("NOTION_TOKEN not set");
  if (!process.env.NOTION_DB_ID) throw new Error("NOTION_DB_ID not set");
  if (!process.env.TMDB_TOKEN) throw new Error("TMDB_TOKEN not set");
}

/**
 * TMDB: Search for a title
 */
async function tmdbSearchTitle(title) {
  const url = `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(
    title
  )}&api_key=${tmdbToken}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("TMDB search error");
  const data = await res.json();
  return data.results[0];
}

/**
 * TMDB: Get full details
 */
async function tmdbGetDetails(type, id) {
  const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${tmdbToken}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("TMDB detail fetch error");
  return await res.json();
}

/**
 * Map TMDB data into Notion properties
 */
function mapToNotionProperties(details, type) {
  return {
    Name: { title: [{ text: { content: details.title || details.name } }] },
    TMDB_ID: { rich_text: [{ text: { content: String(details.id) } }] },
    Type: { select: { name: type } },
    Status: { select: { name: "Planned" } },
    Rating: { number: details.vote_average || null },
    ReleaseDate: {
      date: { start: details.release_date || details.first_air_date || null },
    },
  };
}

/**
 * Find movie in Notion by TMDB ID or title
 */
async function notionFindByTmdbOrTitle(databaseId, tmdbId, title) {
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      or: [
        { property: "TMDB_ID", rich_text: { equals: String(tmdbId) } },
        { property: "Name", title: { equals: title } },
      ],
    },
  });
  return response.results[0] || null;
}

/**
 * Create a new Notion page
 */
async function notionCreatePage(databaseId, properties) {
  return await notion.pages.create({
    parent: { database_id: databaseId },
    properties,
  });
}

/**
 * Update an existing Notion page
 */
async function notionUpdatePage(pageId, properties) {
  return await notion.pages.update({ page_id: pageId, properties });
}

/**
 * Append poster image to Notion page
 */
async function notionAppendPosterImage(pageId, imageUrl) {
  await notion.blocks.children.append({
    block_id: pageId,
    children: [
      { object: "block", type: "image", image: { external: { url: imageUrl } } },
    ],
  });
}

/**
 * Main sync: search TMDB, insert/update in Notion
 */
async function syncOne(title) {
  assertEnv();
  const searchResult = await tmdbSearchTitle(title);
  if (!searchResult) throw new Error("No results from TMDB");

  const details = await tmdbGetDetails(searchResult.media_type, searchResult.id);
  const props = mapToNotionProperties(details, searchResult.media_type);

  let page = await notionFindByTmdbOrTitle(databaseId, details.id, title);
  if (page) {
    page = await notionUpdatePage(page.id, props);
    console.log(`✅ Updated existing: ${title}`);
  } else {
    page = await notionCreatePage(databaseId, props);
    console.log(`🆕 Created new: ${title}`);
  }

  if (details.poster_path) {
    await notionAppendPosterImage(page.id, `https://image.tmdb.org/t/p/w500${details.poster_path}`);
  }
}

// ✅ Exports for bot.js
export {
  tmdbSearchTitle,
  tmdbGetDetails,
  mapToNotionProperties,
  notionFindByTmdbOrTitle,
  notionCreatePage,
  notionUpdatePage,
  notionAppendPosterImage,
  syncOne,
};
