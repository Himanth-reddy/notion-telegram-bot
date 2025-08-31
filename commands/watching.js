// commands/watching.js

import {
  notionFindByTmdbOrTitle,
  notionUpdatePage,
  notionFindByStatus
} from '../services/notion.js';

// This constant is set to the status you requested.
const WATCHING_STATUS = "💛Watching";

export const watchingCommand = async (ctx) => {
  const title = ctx.message.text.replace(/^\/watching/i, "").trim();

  if (title) {
    // --- This is the logic that SETS a movie's status ---
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

      await notionUpdatePage(pageId, { Status: { select: { name: WATCHING_STATUS } } });
      await ctx.reply(`✅ Marked "${pageTitle}" as Watching.`);

    } catch (e) {
      console.error(e);
      await ctx.reply(`❌ An error occurred: ${e.message}`);
    }
  } else {
    // --- This is the logic that LISTS all movies you're watching ---
    try {
      const results = await notionFindByStatus(WATCHING_STATUS);
      if (results.length === 0) {
        return ctx.reply(`📭 You are not currently watching anything.`);
      }

      let replyMessage = `🎬 You are currently watching:\n\n`;
      results.forEach((page) => {
        const pageTitle = page.properties.Title.title[0]?.plain_text || "Untitled";
        replyMessage += `• ${pageTitle}\n`;
      });
      await ctx.reply(replyMessage);

    } catch (e) {
      console.error(e);
      await ctx.reply(`❌ An error occurred: ${e.message}`);
    }
  }
};