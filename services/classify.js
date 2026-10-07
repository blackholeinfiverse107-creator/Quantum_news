/**
 * services/classify.js — India vs International classification.
 *
 * Classification rules (checked in order — first match wins):
 *   1. If the provider supplied _sourceCountry === 'in', mark "india".
 *   2. If the article URL's domain is in the INDIAN_OUTLETS list, mark "india".
 *   3. If the title or snippet mentions any INDIA_KEYWORDS, mark "india".
 *   4. Otherwise mark "international".
 *
 * Each article appears in exactly one category.
 * All rules are configurable in config.js.
 */

const config = require('../config');

/**
 * Extract the hostname from a URL string.
 * @param {string} urlStr
 * @returns {string}
 */
function extractDomain(urlStr) {
  try {
    return new URL(urlStr).hostname.toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Check if a domain matches any entry in the Indian outlets list.
 * Handles subdomains (e.g. "m.timesofindia.indiatimes.com" matches
 * "timesofindia.indiatimes.com").
 * @param {string} domain
 * @returns {boolean}
 */
function isIndianOutlet(domain) {
  return config.INDIAN_OUTLETS.some(
    (outlet) => domain === outlet || domain.endsWith('.' + outlet)
  );
}

/**
 * Check if text contains any India-specific keyword (case-insensitive,
 * word-boundary aware to avoid partial matches like "indicated" for "India").
 * @param {string} text
 * @returns {boolean}
 */
function mentionsIndia(text) {
  const lower = text.toLowerCase();
  return config.INDIA_KEYWORDS.some((kw) => {
    const kwLower = kw.toLowerCase();
    const idx = lower.indexOf(kwLower);
    if (idx === -1) return false;

    // Simple word-boundary check: character before/after should be
    // non-alphanumeric (or start/end of string).
    const before = idx === 0 || !/[a-z0-9]/i.test(lower[idx - 1]);
    const after =
      idx + kwLower.length >= lower.length ||
      !/[a-z0-9]/i.test(lower[idx + kwLower.length]);

    return before && after;
  });
}

/**
 * Classify a single article as "india" or "international".
 * Mutates the article's `category` field and returns the category.
 * @param {object} article
 * @returns {'india' | 'international'}
 */
function classifyArticle(article) {
  // Rule 1: provider-supplied country
  if (article._sourceCountry && article._sourceCountry.toLowerCase() === 'in') {
    article.category = 'india';
    return 'india';
  }

  // Rule 2: Indian outlet domain
  const domain = extractDomain(article.url);
  if (domain && isIndianOutlet(domain)) {
    article.category = 'india';
    return 'india';
  }

  // Rule 3: India keywords in title or snippet
  const text = `${article.title} ${article.snippet}`;
  if (mentionsIndia(text)) {
    article.category = 'india';
    return 'india';
  }

  // Rule 4: everything else
  article.category = 'international';
  return 'international';
}

/**
 * Classify an array of articles in place.
 * @param {object[]} articles
 * @returns {object[]}
 */
function classifyAll(articles) {
  articles.forEach(classifyArticle);
  return articles;
}

module.exports = { classifyArticle, classifyAll, isIndianOutlet, mentionsIndia, extractDomain };
