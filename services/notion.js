import "dotenv/config";
import { Client } from "@notionhq/client";

// --- Initialization ---
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const databaseId = process.env.NOTION_DB_ID;

/**
 * Helper function to ensure Notion environment variables are set.
 */
function assertNotionEnv() {
  if (!process.env.NOTION_TOKEN || !databaseId) {
    throw new Error("NOTION_TOKEN or NOTION_DB_ID not set in .env file");
  }
}

/**
 * Finds pages by their TMDB ID or Title.
 * Used by the search command and the duplicate check.
 */
export async function notionFindByTmdbOrTitle(tmdbId, title) {
  assertNotionEnv();
  const filterConditions = [];
  if (tmdbId) {
    filterConditions.push({ property: "TMDB_ID", rich_text: { equals: String(tmdbId) } });
  }
  if (title) {
    filterConditions.push({ property: "Title", title: { contains: title } });
  }
  if (filterConditions.length === 0) return [];

  const response = await notion.databases.query({
    database_id: databaseId,
    filter: { or: filterConditions },
  });
  return response.results;
}

/**
 * Finds pages that have a specific status.
 * Used by the /watching command to list movies.
 */
export async function notionFindByStatus(statusName) {
  assertNotionEnv();
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: "Status",
      select: {
        equals: statusName,
      },
    },
  });
  return response.results;
}

/**
 * Creates a new page in the Notion database.
 */
export async function notionCreatePage(properties) {
  assertNotionEnv();
  return await notion.pages.create({
    parent: { database_id: databaseId },
    properties,
  });
}

/**
 * Updates the properties of an existing Notion page.
 */
export async function notionUpdatePage(pageId, properties) {
  assertNotionEnv();
  return await notion.pages.update({ page_id: pageId, properties });
}

/**
 * Appends an image block to a Notion page.
 */
export async function notionAppendImage(pageId, imageUrl) {
  assertNotionEnv();
  await notion.blocks.children.append({
    block_id: pageId,
    children: [{ object: "block", type: "image", image: { external: { url: imageUrl } } }],
  });
}