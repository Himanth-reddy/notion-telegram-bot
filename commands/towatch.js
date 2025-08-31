import { notionFindByStatus } from '../services/notion.js';

// ❗ IMPORTANT: Change this text to EXACTLY match your "To Watch" status in Notion
const TO_WATCH_STATUS = "🧡 To Watch";

export const toWatchCommand = async (ctx) => {
  try {
    const results = await notionFindByStatus(TO_WATCH_STATUS);

    if (results.length === 0) {
      return ctx.reply(`🎉 Your "To Watch" list is empty! Add something with /add.`);
    }

    let replyMessage = `📝 You have ${results.length} item(s) on your watchlist:\n\n`;
    results.forEach((page) => {
      const pageTitle = page.properties.Title.title[0]?.plain_text || "Untitled";
      const year = page.properties.Year?.number || "";
      replyMessage += `• ${pageTitle} ${year ? `(${year})` : ''}\n`;
    });
    
    await ctx.reply(replyMessage);
  } catch (e) {
    console.error(e);
    await ctx.reply(`❌ An error occurred: ${e.message}`);
  }
};