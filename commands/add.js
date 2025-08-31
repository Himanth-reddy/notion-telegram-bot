import { syncOne } from '../services/sync.js';

export const addCommand = async (ctx) => {
  const title = ctx.message.text.replace(/^\/add/i, "").trim();
  if (!title) {
    return ctx.reply("⚠️ Usage: /add <title>");
  }
  
  await ctx.reply(`🔍 Processing "${title}"...`);
  
  try {
    // The syncOne function now returns 'created' or 'updated'
    const result = await syncOne(title);

    // Provide a different message based on the result
    if (result === 'created') {
      await ctx.reply(`✅ Added "${title}" to your Notion watchlist.`);
    } else {
      await ctx.reply(`🔄 Updated "${title}" in your Notion watchlist as it already existed.`);
    }
  } catch (e) {
    console.error(e);
    await ctx.reply(`❌ ${e.message}`);
  }
};