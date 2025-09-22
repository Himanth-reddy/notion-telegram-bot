import { Telegraf } from "telegraf";

// Import command handlers (update path if needed, use ../commands for api)
import { startCommand } from "../commands/start.js";
import { addCommand } from "../commands/add.js";
import { searchCommand } from "../commands/search.js";
import { watchedCommand } from "../commands/watched.js";
import { watchingCommand } from "../commands/watching.js";
import { toWatchCommand } from "../commands/towatch.js";

// Environment variables come from Vercel dashboard (not .env file on server)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_CHAT_ID = process.env.ALLOWED_CHAT_ID; // Optional

if (!TELEGRAM_BOT_TOKEN) {
  throw new Error("❌ TELEGRAM_BOT_TOKEN not set in environment.");
}

// Create bot instance
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// Optional: Restrict bot to certain chat id (if you want private bot)
bot.use((ctx, next) => {
  if (ALLOWED_CHAT_ID && String(ctx.chat?.id) !== String(ALLOWED_CHAT_ID)) {
    console.log(`🚫 Unauthorized access from chat ID: ${ctx.chat?.id}`);
    return ctx.reply("⛔️ You are not authorized to use this bot.");
  }
  return next();
});

// Register commands
bot.start(startCommand);
bot.command("add", addCommand);
bot.command("search", searchCommand);
bot.command("watched", watchedCommand);
bot.command("watching", watchingCommand);
bot.command("towatch", toWatchCommand);

// Vercel Serverless Function entrypoint -- must export default async!
export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      await bot.handleUpdate(req.body);
      res.status(200).end();
    } catch (error) {
      console.error("Error handling Telegram update:", error);
      res.status(500).end();
    }
  } else {
    res.status(200).send("🤖 Telegram bot webhook is alive!");
  }
}
