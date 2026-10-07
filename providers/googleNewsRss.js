/**
 * providers/googleNewsRss.js — Google News RSS provider (no API key needed).
 *
 * NOTE: Before using this provider in production, the developer must
 * verify Google News RSS feed terms of use. Google may change or
 * restrict RSS access at any time. This is intended as a free fallback
 * when no API key is available.
 *
 * Uses rss-parser to fetch RSS feeds and decodes Google News redirect
 * tokens (CBMi...) using Google's RPC endpoint (Fbv4je batchexecute) so
 * that every article links directly to the publisher's real website.
 */

const Parser = require('rss-parser');
const config = require('../config');

const parser = new Parser({
  timeout: 10_000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/132.0.0.0',
  },
});

const MAX_ITEMS_PER_PHRASE = 8;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/132.0.0.0';

const GARTURLREQ_CTX = [
  ['X', 'X', ['X', 'X'], null, null, 1, 1, 'US:en', null, 1, null, null, null, null, null, 0, 1],
  'X',
  'X',
  1,
  [1, 1, 1],
  1,
  1,
  null,
  0,
  0,
  null,
  0,
];

/**
 * Build a Google News RSS search URL for a phrase.
 * @param {string} phrase
 * @param {'india' | 'international'} edition
 * @returns {string}
 */
function buildUrl(phrase, edition) {
  const encoded = encodeURIComponent(phrase);
  if (edition === 'india') {
    return `https://news.google.com/rss/search?q=${encoded}&hl=en-IN&gl=IN&ceid=IN:en`;
  }
  return `https://news.google.com/rss/search?q=${encoded}&hl=en-US&gl=US&ceid=US:en`;
}

/**
 * Extract clean title and publisher source name from Google News RSS title.
 * Google News appends " - Source Name" to titles.
 * @param {string} title
 * @returns {{ cleanTitle: string, source: string }}
 */
function extractSource(title) {
  const sep = title.lastIndexOf(' - ');
  if (sep === -1) return { cleanTitle: title, source: 'Unknown' };
  return {
    cleanTitle: title.slice(0, sep).trim(),
    source: title.slice(sep + 3).trim(),
  };
}

/**
 * Fetch decoding parameters (data-n-a-sg and data-n-a-ts) from a Google News article page.
 * @param {string} googleUrl
 * @returns {Promise<{ artId: string, sig: string, ts: number } | null>}
 */
async function getDecodingParams(googleUrl) {
  if (!googleUrl || !googleUrl.includes('news.google.com')) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4_000);

    const res = await fetch(googleUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
    });
    clearTimeout(timer);

    // If redirected to an external domain directly, return it
    if (res.url && !res.url.includes('news.google.com')) {
      return { directUrl: res.url };
    }

    const html = await res.text();
    const sg = html.match(/data-n-a-sg="([^"]+)"/);
    const ts = html.match(/data-n-a-ts="([^"]+)"/);

    if (sg && ts) {
      const urlObj = new URL(googleUrl);
      const pathParts = urlObj.pathname.split('/');
      const artId = pathParts[pathParts.length - 1];
      return { artId, sig: sg[1], ts: parseInt(ts[1], 10) };
    }
  } catch {
    // Silent failover
  }
  return null;
}

/**
 * Batch-decode Google News article tokens to destination URLs using batchexecute.
 * @param {Array<{ reqId: string | number, artId: string, ts: number, sig: string }>} items
 * @returns {Promise<Record<string, string>>}
 */
async function batchDecode(items) {
  if (!items.length) return {};

  try {
    const envelopes = items.map((item) => {
      const inner = ['garturlreq', GARTURLREQ_CTX, item.artId, item.ts, item.sig];
      return ['Fbv4je', JSON.stringify(inner), null, String(item.reqId)];
    });

    const body = 'f.req=' + encodeURIComponent(JSON.stringify([envelopes]));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6_000);

    const postRes = await fetch('https://news.google.com/_/DotsSplashUi/data/batchexecute', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'User-Agent': USER_AGENT,
      },
      body,
    });
    clearTimeout(timer);

    const postText = await postRes.text();
    let cleanText = postText;
    const parts = cleanText.split('\n\n');
    if (parts.length > 1) {
      cleanText = parts[1];
    }
    cleanText = cleanText.trim();
    if (cleanText.startsWith(")]}'")) {
      const newlineIdx = cleanText.indexOf('\n');
      cleanText = newlineIdx !== -1 ? cleanText.slice(newlineIdx + 1).trim() : cleanText.slice(4).trim();
    }

    const rows = JSON.parse(cleanText);
    const results = {};
    for (const row of rows) {
      if (Array.isArray(row) && row.length >= 3) {
        let payload = row[2];
        if (typeof payload === 'string') {
          try {
            payload = JSON.parse(payload);
          } catch {}
        }
        if (Array.isArray(payload) && payload[0] === 'garturlres') {
          let reqId = null;
          for (let i = row.length - 1; i >= 3; i--) {
            if (row[i] !== null && row[i] !== undefined) {
              reqId = String(row[i]);
              break;
            }
          }
          if (reqId !== null && payload[1]) {
            results[reqId] = payload[1];
          }
        }
      }
    }
    return results;
  } catch (err) {
    console.warn('[RSS] Batch decode error:', err.message);
    return {};
  }
}

/**
 * Resolve a list of articles from Google News redirect tokens to real publisher URLs.
 * @param {object[]} articles
 * @returns {Promise<object[]>}
 */
async function resolveArticleUrls(articles) {
  // Only decode items that have news.google.com URLs
  const toDecode = articles.map((a, idx) => ({ article: a, idx })).filter(item => item.article.url.includes('news.google.com'));

  if (!toDecode.length) return articles;

  // Fetch parameters concurrently in chunks of 10
  const CHUNK_SIZE = 10;
  const paramMap = new Map();

  for (let i = 0; i < toDecode.length; i += CHUNK_SIZE) {
    const chunk = toDecode.slice(i, i + CHUNK_SIZE);
    const params = await Promise.all(
      chunk.map(async ({ article, idx }) => {
        const p = await getDecodingParams(article.url);
        return { idx, p };
      })
    );
    for (const { idx, p } of params) {
      if (p) paramMap.set(idx, p);
    }
  }

  // Separate direct redirects vs items needing batchexecute
  const batchItems = [];
  const directResolved = new Map();

  for (const [idx, p] of paramMap.entries()) {
    if (p.directUrl) {
      directResolved.set(idx, p.directUrl);
    } else if (p.artId && p.sig && p.ts) {
      batchItems.push({ reqId: idx, artId: p.artId, sig: p.sig, ts: p.ts });
    }
  }

  // Execute batchexecute in chunks of 20
  const decodedResults = {};
  for (let i = 0; i < batchItems.length; i += 20) {
    const batch = batchItems.slice(i, i + 20);
    const res = await batchDecode(batch);
    Object.assign(decodedResults, res);
  }

  // Apply resolved URLs to articles
  let count = 0;
  const updated = articles.map((article, idx) => {
    const realUrl = directResolved.get(idx) || decodedResults[String(idx)];
    if (realUrl) {
      count++;
      return { ...article, url: realUrl };
    }
    return article;
  });

  console.log(`[RSS] Successfully resolved ${count}/${toDecode.length} real publisher URLs.`);
  return updated;
}

/**
 * Normalize an RSS item to our standard article shape.
 * @param {object} item
 * @param {'india' | 'international'} edition
 * @returns {import('./index').Article}
 */
function normalize(item, edition) {
  const { cleanTitle, source } = extractSource(item.title || '');
  return {
    id: item.link || item.guid || '',
    title: cleanTitle,
    source,
    sourceUrl: '',
    url: item.link || '',
    publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
    snippet: (item.contentSnippet || item.content || '').replace(/<[^>]*>/g, '').slice(0, 200),
    category: null,  // set by classifier
    _sourceCountry: edition === 'india' ? 'in' : null,
  };
}

/**
 * Fetch articles from Google News RSS for one edition.
 * @param {'india' | 'international'} edition
 * @returns {Promise<object[]>}
 */
async function fetchEdition(edition) {
  const results = [];
  for (const phrase of config.SEARCH_PHRASES) {
    try {
      const url = buildUrl(phrase, edition);
      const feed = await parser.parseURL(url);
      const items = (feed.items || []).slice(0, MAX_ITEMS_PER_PHRASE);
      for (const item of items) {
        results.push(normalize(item, edition));
      }
    } catch (err) {
      console.warn(`[RSS] Failed for phrase "${phrase}" (${edition}):`, err.message);
    }
  }
  return results;
}

/**
 * Fetch articles across editions and decode real publisher URLs.
 * @param {{ scope: 'india' | 'international' | 'all' }} options
 * @returns {Promise<import('./index').Article[]>}
 */
async function fetchArticles({ scope = 'all' } = {}) {
  const results = [];

  if (scope === 'india' || scope === 'all') {
    results.push(...(await fetchEdition('india')));
  }
  if (scope === 'international' || scope === 'all') {
    results.push(...(await fetchEdition('international')));
  }

  // Deduplicate roughly by title before URL resolution to minimize requests
  const seen = new Set();
  const unique = [];
  for (const a of results) {
    const key = a.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(a);
    }
  }

  // Resolve Google News redirect tokens to real publisher URLs
  console.log(`[RSS] Fetched ${unique.length} unique articles. Resolving publisher URLs...`);
  const resolved = await resolveArticleUrls(unique);
  return resolved;
}

module.exports = { fetchArticles, resolveArticleUrls, name: 'rss' };
