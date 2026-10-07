/**
 * providers/index.js — Provider orchestration layer.
 *
 * Selection order:
 *   1. Explicitly configured provider (env PROVIDER)
 *   2. GNews (if GNEWS_API_KEY is set)
 *   3. Google News RSS (free, no key)
 *   4. Mock data (always works)
 *
 * If USE_MOCK=true, skip directly to mock.
 *
 * @typedef {{ id: string, title: string, source: string, sourceUrl?: string,
 *             url: string, publishedAt: string, snippet: string,
 *             category: 'india' | 'international' | null,
 *             _sourceCountry?: string | null }} Article
 */

const config = require('../config');
const gnews = require('./gnews');
const rss = require('./googleNewsRss');
const mock = require('./mock');

/** Map of provider name → module */
const PROVIDERS = {
  gnews,
  rss,
  mock,
};

/**
 * Build the ordered list of providers to try.
 * @returns {{ name: string, provider: { fetchArticles: Function } }[]}
 */
function buildChain() {
  // Short-circuit to mock
  if (config.USE_MOCK) {
    return [{ name: 'mock', provider: mock }];
  }

  const chain = [];

  // 1. Explicitly configured?
  if (config.PROVIDER && PROVIDERS[config.PROVIDER]) {
    chain.push({ name: config.PROVIDER, provider: PROVIDERS[config.PROVIDER] });
  }

  // 2. GNews if key is available and not already in the chain
  if (config.GNEWS_API_KEY && !chain.some((c) => c.name === 'gnews')) {
    chain.push({ name: 'gnews', provider: gnews });
  }

  // 3. RSS fallback
  if (!chain.some((c) => c.name === 'rss')) {
    chain.push({ name: 'rss', provider: rss });
  }

  // 4. Mock is always last resort
  if (!chain.some((c) => c.name === 'mock')) {
    chain.push({ name: 'mock', provider: mock });
  }

  return chain;
}

/**
 * Fetch articles, trying providers in order until one succeeds.
 * @param {{ scope: 'all' | 'india' | 'international' }} options
 * @returns {Promise<{ articles: Article[], provider: string }>}
 */
async function fetchArticles({ scope = 'all' } = {}) {
  const chain = buildChain();

  for (const { name, provider } of chain) {
    try {
      console.log(`[Provider] Trying "${name}"…`);
      const articles = await provider.fetchArticles({ scope });

      if (!articles || articles.length === 0) {
        console.warn(`[Provider] "${name}" returned 0 articles, trying next.`);
        continue;
      }

      console.log(`[Provider] "${name}" returned ${articles.length} articles.`);
      return { articles, provider: name };
    } catch (err) {
      console.warn(`[Provider] "${name}" failed: ${err.message}`);
    }
  }

  // If absolutely everything fails, return empty
  console.error('[Provider] All providers failed. Returning empty result.');
  return { articles: [], provider: 'none' };
}

module.exports = { fetchArticles };
