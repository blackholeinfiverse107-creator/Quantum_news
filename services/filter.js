/**
 * services/filter.js — Relevance filtering and age filtering.
 *
 * An article is kept only if:
 *   1. Its title or snippet contains at least one INCLUDE_TERM.
 *   2. Its title or snippet does NOT match any EXCLUDE_TERM.
 *   3. It was published within MAX_AGE_DAYS.
 */

const config = require('../config');

/**
 * Check if text contains any term from a list (case-insensitive).
 * @param {string} text
 * @param {string[]} terms
 * @returns {boolean}
 */
function containsAny(text, terms) {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term.toLowerCase()));
}

/**
 * Check if an article passes the relevance filter.
 * @param {{ title: string, snippet: string }} article
 * @returns {boolean}
 */
function isRelevant(article) {
  const text = `${article.title} ${article.snippet}`;

  // Must match at least one include term
  if (!containsAny(text, config.INCLUDE_TERMS)) return false;

  // Must not match any exclude term
  if (containsAny(text, config.EXCLUDE_TERMS)) return false;

  return true;
}

/**
 * Check if an article is within the allowed age window.
 * @param {{ publishedAt: string }} article
 * @param {number} [maxAgeDays]
 * @returns {boolean}
 */
function isRecent(article, maxAgeDays = config.MAX_AGE_DAYS) {
  const published = new Date(article.publishedAt);
  if (isNaN(published.getTime())) return false;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxAgeDays);

  return published >= cutoff;
}

/**
 * Filter a list of articles by relevance and recency.
 * @param {object[]} articles
 * @returns {object[]}
 */
function filterArticles(articles) {
  return articles.filter((a) => isRelevant(a) && isRecent(a));
}

module.exports = { filterArticles, isRelevant, isRecent, containsAny };
