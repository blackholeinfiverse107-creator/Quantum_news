/**
 * services/cache.js — Simple in-memory cache with TTL.
 *
 * Stores the last successful API response and serves it if:
 *   - It is younger than CACHE_MINUTES → fresh
 *   - The upstream request fails → stale (with stale: true flag)
 */

const config = require('../config');

let cached = null;   // { data, fetchedAt: Date }

/**
 * Get cached data if still fresh.
 * @returns {{ data: object, stale: boolean } | null}
 */
function get() {
  if (!cached) return null;

  const ageMs = Date.now() - cached.fetchedAt.getTime();
  const maxMs = config.CACHE_MINUTES * 60 * 1000;

  if (ageMs < maxMs) {
    return { data: cached.data, stale: false };
  }

  // Expired but still available as stale
  return null;
}

/**
 * Get stale cached data (used when upstream fails).
 * @returns {{ data: object, stale: true } | null}
 */
function getStale() {
  if (!cached) return null;
  return { data: cached.data, stale: true };
}

/**
 * Store data in cache.
 * @param {object} data
 */
function set(data) {
  cached = { data, fetchedAt: new Date() };
}

/**
 * Clear the cache (useful for testing).
 */
function clear() {
  cached = null;
}

module.exports = { get, getStale, set, clear };
