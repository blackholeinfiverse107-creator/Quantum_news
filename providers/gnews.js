/**
 * providers/gnews.js — GNews API provider.
 *
 * NOTE: Before using this provider in production, the developer must
 * verify GNews's current terms of use, rate limits, and API pricing at
 * https://gnews.io/docs/. Free tier typically allows 100 requests/day.
 */

const config = require('../config');

const BASE_URL = 'https://gnews.io/api/v4/search';
const TIMEOUT_MS = 10_000;

/**
 * Fetch articles from GNews for a single search phrase.
 * @param {string} phrase
 * @param {string} lang  — language code, e.g. "en"
 * @param {string|null} country — optional 2-letter country code
 * @returns {Promise<object[]>}
 */
async function searchPhrase(phrase, lang, country) {
  const params = new URLSearchParams({
    q: phrase,
    lang,
    max: '10',
    sortby: 'publishedAt',
    apikey: config.GNEWS_API_KEY,
  });
  if (country) params.set('country', country);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}?${params}`, {
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`GNews HTTP ${res.status}: ${body}`);
    }

    const json = await res.json();
    return json.articles || [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Normalize a GNews article into our standard shape.
 */
function normalize(raw) {
  return {
    id: raw.url,
    title: raw.title || '',
    source: raw.source?.name || 'Unknown',
    sourceUrl: raw.source?.url || '',
    url: raw.url,
    publishedAt: raw.publishedAt || new Date().toISOString(),
    snippet: (raw.description || '').slice(0, 200),
    // category is set later by the classifier
    category: null,
    // extra metadata useful for classification
    _sourceCountry: null,
  };
}

/**
 * @param {{ scope: 'india' | 'international' | 'all' }} options
 * @returns {Promise<import('./index').Article[]>}
 */
async function fetchArticles({ scope = 'all' } = {}) {
  if (!config.GNEWS_API_KEY) {
    throw new Error('GNEWS_API_KEY is not set');
  }

  const phrases = config.SEARCH_PHRASES;
  const results = [];

  if (scope === 'india' || scope === 'all') {
    // India-scoped searches
    for (const phrase of phrases) {
      const articles = await searchPhrase(phrase, 'en', 'in');
      for (const a of articles) {
        const norm = normalize(a);
        norm._sourceCountry = 'in';
        results.push(norm);
      }
    }
  }

  if (scope === 'international' || scope === 'all') {
    // Global searches (no country filter)
    for (const phrase of phrases) {
      const articles = await searchPhrase(phrase, 'en', null);
      results.push(...articles.map(normalize));
    }
  }

  return results;
}

module.exports = { fetchArticles, name: 'gnews' };
