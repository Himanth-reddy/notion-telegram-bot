// commands/watched.js

import {
  notionFindByTmdbOrTitle,
  notionUpdatePage,
} from '../services/notion.js';

// The new status text as requested
const WATCHED_STATUS = '💚Watched';

export const watchedCommand = async (ctx) => {
  // The command is now /watched
  const title = ctx.message.text.replace(/^\/watched/i, "").trim();

  if (!title) {
    return ctx.reply(`⚠️ Usage: /watched <title>`);
  }

  try {
    const results = await notionFindByTmdbOrTitle(null, title);

    if (results.length === 0) {
      return ctx.reply(`❌ Could not find "${title}" in your watchlist.`);
    }
    if (results.length > 1) {
      return ctx.reply(`⚠️ Found multiple matches for "${title}". Please be more specific.`);
    }

    const pageId = results[0].id;
    const pageTitle = results[0].properties.Title.title[0]?.plain_text;

    // Use the new status when updating the page
    await notionUpdatePage(pageId, { Status: { select: { name: WATCHED_STATUS } } });
    await ctx.reply(`✅ Marked "${pageTitle}" as Watched.`);

  } catch (e) {
    console.error(e);
    await ctx.reply(`❌ An error occurred: ${e.message}`);
  }
};