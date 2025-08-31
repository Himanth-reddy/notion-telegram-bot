import { Telegraf } from "telegraf";
import "dotenv/config";

// --- Import all of your command handlers ---
import { startCommand } from './commands/start.js';
import { addCommand } from './commands/add.js';
import { searchCommand } from './commands/search.js';
import { watchedCommand } from './commands/watched.js';
import { watchingCommand } from './commands/watching.js';

// --- Environment Variable Setup ---
const {
  TELEGRAM_BOT_TOKEN,
  ALLOWED_CHAT_ID // This is optional
} = process.env;

if (!TELEGRAM_BOT_TOKEN) {
  console.error("❌ Missing TELEGRAM_BOT_TOKEN in .env file");
  process.exit(1);
}

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// --- Optional Middleware: Restrict bot to a specific chat ---
bot.use((ctx, next) => {
  // If ALLOWED_CHAT_ID is not set, the bot will be public.
  if (ALLOWED_CHAT_ID && String(ctx.chat?.id) !== String(ALLOWED_CHAT_ID)) {
    console.log(`🚫 Unauthorized access from chat ID: ${ctx.chat?.id}`);
    return ctx.reply("⛔️ You are not authorized to use this bot.");
  }
  return next();
});

// --- Register all commands with the bot ---
bot.start(startCommand);
bot.command("add", addCommand);
bot.command("search", searchCommand);
bot.command("watched", watchedCommand);
bot.command("watching", watchingCommand);

// --- Start the bot ---
bot.launch().then(() => {
  console.log("🤖 Bot started successfully!");
});

// --- Graceful Stop ---
// Enables the bot to shut down cleanly when you stop the process
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));