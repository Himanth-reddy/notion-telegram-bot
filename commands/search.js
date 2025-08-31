// commands/search.js

// Import the central search function from the Notion service
import { notionFindByTmdbOrTitle } from '../services/notion.js';

export const searchCommand = async (ctx) => {
  // 1. Get the search query from the user's message.
  const query = ctx.message.text.replace(/^\/search/i, "").trim();
  
  // 2. Check if a query was provided.
  if (!query) {
    return ctx.reply("⚠️ Usage: /search <title>");
  }

  // 3. Run the search and handle any potential errors.
  try {
    // 4. Call the central search function to find movies by title.
    const results = await notionFindByTmdbOrTitle(null, query);

    if (results.length === 0) {
      return ctx.reply(`📭 No movies found in your watchlist matching "${query}".`);
    }

    // 5. Format the results into a single, clean message.
    let replyMessage = `🔎 Found ${results.length} result(s) for "${query}":\n\n`;
    results.forEach((page) => {
      const title = page.properties.Title.title[0]?.plain_text || "Untitled";
      const status = page.properties.Status?.select?.name || "No Status";
      const year = page.properties.Year?.number || "";
      replyMessage += `• ${title} ${year ? `(${year})` : ''} — ${status}\n`;
    });

    // 6. Send the formatted message back to the user.
    await ctx.reply(replyMessage);

  } catch (e) {
    console.error(e);
    await ctx.reply(`❌ An error occurred while searching: ${e.message}`);
  }
};