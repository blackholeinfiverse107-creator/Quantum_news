/**
 * server.js — Express application for Quantum News Explorer.
 *
 * Serves the static frontend and exposes GET /api/quantum-news.
 */

const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const providers = require('./providers');
const { filterArticles } = require('./services/filter');
const { classifyAll } = require('./services/classify');
const { deduplicateArticles } = require('./services/dedupe');
const cache = require('./services/cache');

const app = express();

/* ── Static files ──────────────────────────────────────────── */
app.use(express.static(path.join(__dirname, 'public')));

/* ── Rate limiting on the API endpoint ─────────────────────── */
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,   // 1 minute
  max: 30,                    // 30 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

app.use('/api/quantum-news', apiLimiter);

/* ── API route ─────────────────────────────────────────────── */
app.get('/api/quantum-news', async (req, res) => {
  // 1. Check cache (bypass if ?refresh=true)
  const forceRefresh = req.query.refresh === 'true';
  const freshCache = !forceRefresh && cache.get();
  if (freshCache) {
    return res.json(freshCache.data);
  }

  try {
    // 2. Fetch from provider chain
    const { articles: raw, provider } = await providers.fetchArticles({ scope: 'all' });

    // 3. Filter for relevance and recency
    const filtered = filterArticles(raw);

    // 4. Classify each article
    classifyAll(filtered);

    // 5. Deduplicate
    const unique = deduplicateArticles(filtered);

    // 6. Split into categories, sorted newest-first
    const india = unique
      .filter((a) => a.category === 'india')
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    const international = unique
      .filter((a) => a.category === 'international')
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    // 7. Strip internal fields before sending to client
    const clean = (arr) =>
      arr.map(({ _sourceCountry, sourceUrl, ...rest }) => rest);

    const payload = {
      india: clean(india),
      international: clean(international),
      fetchedAt: new Date().toISOString(),
      provider,
      stale: false,
    };

    // 8. Cache the result
    cache.set(payload);

    return res.json(payload);
  } catch (err) {
    console.error('[API] Upstream error:', err.message);

    // Serve stale cache if available
    const stale = cache.getStale();
    if (stale) {
      return res.json({ ...stale.data, stale: true });
    }

    return res.status(502).json({
      error: 'Unable to fetch quantum news at this time. Please try again later.',
    });
  }
});

/* ── Start ─────────────────────────────────────────────────── */
const PORT = config.PORT;
app.listen(PORT, () => {
  console.log(`\n🔬 Quantum News Explorer running at http://localhost:${PORT}\n`);
  console.log(`   USE_MOCK = ${config.USE_MOCK}`);
  console.log(`   PROVIDER = ${config.PROVIDER || '(auto)'}`);
  console.log(`   CACHE_MINUTES = ${config.CACHE_MINUTES}`);
  console.log(`   MAX_AGE_DAYS  = ${config.MAX_AGE_DAYS}\n`);
});

module.exports = app; // for testing
