import "dotenv/config";
import fetch from "node-fetch";

// --- Initialization ---
const tmdbToken = process.env.TMDB_TOKEN;

/**
 * Helper function to ensure the TMDB API key is set.
 */
function assertTmdbEnv() {
  if (!tmdbToken) throw new Error("TMDB_TOKEN not set in .env file");
}

/**
 * Searches for a movie or TV show by its title.
 */
export async function tmdbSearchTitle(title) {
  assertTmdbEnv();
  const url = `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(
    title
  )}&api_key=${tmdbToken}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB search failed with status: ${res.status}`);
  const data = await res.json();
  return data.results[0]; // Return the most relevant result
}

/**
 * Gets the full, rich details for a specific movie or show using its ID.
 */
export async function tmdbGetDetails(type, id) {
  assertTmdbEnv();
  const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${tmdbToken}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB detail fetch failed with status: ${res.status}`);
  return await res.json();
}

/**
 * Gets the list of streaming platforms for a title in a specific region.
 */
export async function tmdbGetProviders(type, id) {
  assertTmdbEnv();
  // Note: This fetches providers for the US market. You can change 'US' to your country code.
  const url = `https://api.themoviedb.org/3/${type}/${id}/watch/providers?api_key=${tmdbToken}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`Could not fetch providers for ${type} ${id}.`);
    return [];
  }
  const data = await res.json();
  // 'flatrate' usually refers to subscription services (like Netflix, Hulu)
  const providers = data.results?.US?.flatrate || [];
  return providers.map(p => ({ name: p.provider_name }));
}