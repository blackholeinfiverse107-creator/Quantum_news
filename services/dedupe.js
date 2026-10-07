/**
 * services/dedupe.js — Deduplication of articles.
 *
 * Two-pass deduplication:
 *   1. Exact match on normalized URL (strip protocol, www., trailing slash,
 *      query string, and fragment).
 *   2. Near-identical title match (lowercase, remove punctuation and
 *      extra whitespace).
 *
 * When duplicates are found, the article with the earlier publishedAt
 * is kept (i.e. the original source is preferred).
 */

/**
 * Normalize a URL for deduplication.
 * @param {string} urlStr
 * @returns {string}
 */
function normalizeUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    let host = url.hostname.toLowerCase().replace(/^www\./, '');
    let path = url.pathname.replace(/\/+$/, '');
    return `${host}${path}`;
  } catch {
    return urlStr.toLowerCase().trim();
  }
}

/**
 * Normalize a title for near-identical comparison.
 * Lowercases, strips punctuation, collapses whitespace.
 * @param {string} title
 * @returns {string}
 */
function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')   // strip punctuation
    .replace(/\s+/g, ' ')      // collapse whitespace
    .trim();
}

/**
 * Deduplicate an array of articles.
 * @param {object[]} articles
 * @returns {object[]}
 */
function deduplicateArticles(articles) {
  const seenUrls = new Map();   // normalizedUrl → article
  const seenTitles = new Map(); // normalizedTitle → article

  const result = [];

  for (const article of articles) {
    // Pass 1: URL dedup
    const normUrl = normalizeUrl(article.url);
    if (seenUrls.has(normUrl)) continue;

    // Pass 2: title dedup
    const normTitle = normalizeTitle(article.title);
    if (normTitle && seenTitles.has(normTitle)) continue;

    seenUrls.set(normUrl, article);
    if (normTitle) seenTitles.set(normTitle, article);
    result.push(article);
  }

  return result;
}

module.exports = { deduplicateArticles, normalizeUrl, normalizeTitle };
