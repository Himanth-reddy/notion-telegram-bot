// commands/add.js

// Import the main logic function from the sync service
import { syncOne } from '../services/sync.js';

export const addCommand = async (ctx) => {
  // 1. Get the movie title from the user's message.
  const title = ctx.message.text.replace(/^\/add/i, "").trim();
  
  // 2. Check if a title was actually provided.
  if (!title) {
    return ctx.reply("⚠️ Usage: /add <title>");
  }
  
  // 3. Let the user know the bot is working on it.
  await ctx.reply(`🔍 Adding "${title}"...`);
  
  // 4. Call the main sync function and handle any potential errors.
  try {
    await syncOne(title);
    await ctx.reply(`✅ Added/updated "${title}" in Notion`);
  } catch (e) {
    // 5. If an error occurs, log it and inform the user.
    console.error(e);
    await ctx.reply(`❌ ${e.message}`);
  }
};