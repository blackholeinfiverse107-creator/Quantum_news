/**
 * providers/mock.js — Mock data provider.
 *
 * Reads articles from sample-data/articles.json.
 * Used when USE_MOCK=true or when no other provider succeeds.
 */

const path = require('path');
const fs = require('fs');

const SAMPLE_PATH = path.join(__dirname, '..', 'sample-data', 'articles.json');

/**
 * @param {{ scope: 'india' | 'international' | 'all' }} options
 * @returns {Promise<import('./index').Article[]>}
 */
async function fetchArticles({ scope = 'all' } = {}) {
  const raw = fs.readFileSync(SAMPLE_PATH, 'utf-8');
  const articles = JSON.parse(raw);

  if (scope === 'all') return articles;
  return articles.filter((a) => a.category === scope);
}

module.exports = { fetchArticles, name: 'mock' };
