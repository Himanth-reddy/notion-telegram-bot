import { Telegraf } from 'telegraf';
import 'dotenv/config';
import {
  syncOne,
  notionFindByTmdbOrTitle,
  notionUpdatePage
} from './sync_tmdb_to_notion.js';

const {
  TELEGRAM_BOT_TOKEN,
  NOTION_DB_ID,
  NOTION_TOKEN,
  ALLOWED_CHAT_ID // optional security
} = process.env;

if (!TELEGRAM_BOT_TOKEN || !NOTION_DB_ID || !NOTION_TOKEN) {
  console.error('Missing env vars: TELEGRAM_BOT_TOKEN, NOTION_DB_ID, NOTION_TOKEN');
  process.exit(1);
}

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// optional: lock bot to your chat/user only
bot.use((ctx, next) => {
  if (!ALLOWED_CHAT_ID) return next();
  if (String(ctx.chat?.id) !== String(ALLOWED_CHAT_ID)) {
    return ctx.reply('⛔️ Not authorized.');
  }
  return next();
});

bot.start((ctx) =>
  ctx.reply(
    '🎬 Notion Watchlist Bot\n\n' +
    'Commands:\n' +
    '/add <title>\n' +
    '/status <title> <🧡 To Watch|📺 Watching|✅ Finished>\n' +
    '/finish <title>\n' +
    '/watching\n' +
    '/search <title>'
  )
);

// /add
bot.command('add', async (ctx) => {
  const title = ctx.message.text.replace(/^\/add/i, '').trim();
  if (!title) return ctx.reply('⚠️ Usage: /add <title>');
  await ctx.reply(`🔍 Adding "${title}"...`);
  try {
    await syncOne(title);
    await ctx.reply(`✅ Added/updated "${title}" in Notion`);
  } catch (e) {
    await ctx.reply(`❌ ${e.message}`);
  }
});

// /status
bot.command('status', async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);
  if (args.length < 2) return ctx.reply('⚠️ Usage: /status <title> <🧡 To Watch|📺 Watching|✅ Finished>');
  const newStatus = args.pop();
  const title = args.join(' ');
  try {
    const existing = await notionFindByTmdbOrTitle(null, title);
    if (!existing?.length) return ctx.reply(`❌ Not found: "${title}"`);
    const pageId = existing[0].id;
    await notionUpdatePage(pageId, { Status: { select: { name: newStatus } } });
    await ctx.reply(`✅ "${title}" → ${newStatus}`);
  } catch (e) {
    await ctx.reply(`❌ ${e.message}`);
  }
});

// /finish
bot.command('finish', async (ctx) => {
  const title = ctx.message.text.replace(/^\/finish/i, '').trim();
  if (!title) return ctx.reply('⚠️ Usage: /finish <title>');
  try {
    const existing = await notionFindByTmdbOrTitle(null, title);
    if (!existing?.length) return ctx.reply(`❌ Not found: "${title}"`);
    const pageId = existing[0].id;
    await notionUpdatePage(pageId, { Status: { select: { name: '✅ Finished' } } });
    await ctx.reply(`✅ Marked "${title}" as ✅ Finished`);
  } catch (e) {
    await ctx.reply(`❌ ${e.message}`);
  }
});

// /watching
bot.command('watching', async (ctx) => {
  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filter: { property: 'Status', select: { equals: '📺 Watching' } }
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    if (!data.results.length) return ctx.reply('📭 Nothing in "📺 Watching".');
    const lines = data.results.map(r => {
      const p = r.properties;
      const name = p.Title?.title?.[0]?.plain_text || 'Untitled';
      const year = p.Year?.number || '';
      return `• ${name}${year ? ` (${year})` : ''}`;
    });
    await ctx.reply(`🎬 Currently Watching:\n${lines.join('\n')}`);
  } catch (e) {
    await ctx.reply(`❌ ${e.message}`);
  }
});

// /search
bot.command('search', async (ctx) => {
  const q = ctx.message.text.replace(/^\/search/i, '').trim();
  if (!q) return ctx.reply('⚠️ Usage: /search <title>');
  try {
    const hits = await notionFindByTmdbOrTitle(null, q);
    if (!hits?.length) return ctx.reply(`No matches for "${q}".`);
    const lines = hits.map(r => {
      const p = r.properties;
      const name = p.Title?.title?.[0]?.plain_text || 'Untitled';
      const year = p.Year?.number || '';
      const status = p.Status?.select?.name || '—';
      return `• ${name}${year ? ` (${year})` : ''} → ${status}`;
    });
    await ctx.reply(`🔎 Results for "${q}":\n${lines.join('\n')}`);
  } catch (e) {
    await ctx.reply(`❌ ${e.message}`);
  }
});

// graceful shutdown for Render
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

bot.launch().then(() => console.log('🚀 Bot started'));
