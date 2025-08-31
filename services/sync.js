import {
  tmdbSearchTitle,
  tmdbGetDetails,
  tmdbGetProviders,
} from "./tmdb.js";
import {
  notionFindByTmdbOrTitle,
  notionCreatePage,
  notionUpdatePage,
  notionAppendImage,
} from "./notion.js";

/**
 * Maps the detailed data from TMDB to the structure required by the Notion API.
 * This is the "blueprint" for your Notion pages.
 */
function mapToNotionProperties(details, type, providers) {
    const props = {
      "Title": { title: [{ text: { content: details.title || details.name } }] },
      "Format": { select: { name: type === 'tv' ? '📺 TV Show' : '🎬 Movie' } },
      "IMDB": { number: details.vote_average ? Number(details.vote_average.toFixed(1)) : null },
      "TMDB_ID": { rich_text: [{ text: { content: String(details.id) } }] },
      "Status": { select: { name: "🧡 To Watch" } }, // Default status when adding a new item
      "Year": { number: new Date(details.release_date || details.first_air_date).getFullYear() || null },
      "Genre": { multi_select: details.genres ? details.genres.map(g => ({ name: g.name })) : [] },
    };
  
    // Add properties that only exist for TV shows
    if (type === 'tv') {
      props["Seasons"] = { number: details.number_of_seasons || null };
      props["Total Eps"] = { number: details.number_of_episodes || null };
    }
  
    // Add the streaming platform if one was found
    if (providers && providers.length > 0) {
      props["Platform"] = { select: providers[0] };
    }
  
    return props;
}

/**
 * The main function to sync a single item from TMDB to Notion.
 * It handles searching, duplicate checking, creating/updating, and adding images.
 */
export async function syncOne(title) {
  // 1. Find the item on TMDB
  const searchResult = await tmdbSearchTitle(title);
  if (!searchResult) throw new Error(`No results found for "${title}" on TMDB.`);

  const mediaType = searchResult.media_type;
  if (mediaType !== 'movie' && mediaType !== 'tv') {
    throw new Error(`Found result for "${title}", but it's not a movie or TV show.`);
  }

  // 2. Get all the rich details (metadata, providers) from TMDB
  const [details, providers] = await Promise.all([
    tmdbGetDetails(mediaType, searchResult.id),
    tmdbGetProviders(mediaType, searchResult.id),
  ]);

  // 3. Prepare the data to be saved in Notion
  const props = mapToNotionProperties(details, mediaType, providers);

  // 4. Check if the item already exists in Notion to prevent duplicates
  const existingPages = await notionFindByTmdbOrTitle(details.id, details.title || details.name);
  let page;

  // 5. If it exists, update it; otherwise, create it
  if (existingPages.length > 0) {
    page = await notionUpdatePage(existingPages[0].id, props);
    console.log(`✅ Updated existing entry: ${title}`);
  } else {
    page = await notionCreatePage(props);
    console.log(`🆕 Created new entry: ${title}`);
  }

  // 6. Add the backdrop image to the Notion page
  if (details.backdrop_path) {
    await notionAppendImage(page.id, `https://image.tmdb.org/t/p/w1280${details.backdrop_path}`);
  }
}