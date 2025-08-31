// commands/start.js

export const startCommand = (ctx) => {
  const welcomeMessage = `
🎬 **Notion Watchlist Bot**

Hello! I'm here to help you manage your movie and TV show watchlist in Notion.

**Available Commands:**

/add <title>
  Adds a new item to your watchlist.

/search <title>
  Searches for an item in your list.

/towatch
  Lists all items in your 'To Watch' list.

/watching
  Lists all items you are currently watching.

/watching <title>
  Marks an item as "Watching".

/watched <title>
  Marks an item as "Watched".
  `;
  ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });
};