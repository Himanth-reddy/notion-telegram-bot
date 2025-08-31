import {
  notionFindByTmdbOrTitle,
  notionUpdatePage,
  notionFindByStatus
} from '../services/notion.js';

// This is the updated status text
const WATCHING_STATUS = "💛Watching";

export const watchingCommand = async (ctx) => {
  const title = ctx.message.text.replace(/^\/watching/i, "").trim();

  if (title) {
    // --- SCENARIO 1: Set a movie's status to "Watching" ---
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
    // --- SCENARIO 2: List all movies you are "Watching" ---
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