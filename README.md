# Quantum News Explorer

A web app that surfaces recently published quantum technology news, split into two categories — **India (national)** and **International** — with a single-click interface.

![Landing page](docs/landing.png)

---

## Quick Start

```bash
# 1. Clone / copy the project
cd quantum-news-explorer

# 2. Install dependencies
npm install

# 3. Copy the env template
cp .env.example .env        # Edit .env if you have a GNews API key

# 4. Run (defaults to mock data with no API key)
npm start
# → http://localhost:3000
```

The app works out of the box with no API key — it falls back to Google News RSS, then to built-in mock data.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `GNEWS_API_KEY` | _(empty)_ | API key from [gnews.io](https://gnews.io). Optional. |
| `USE_MOCK` | `false` | Force mock data (`true` / `false`). |
| `PROVIDER` | _(auto)_ | Force a provider: `gnews`, `rss`, or `mock`. |
| `CACHE_MINUTES` | `30` | How long to cache API responses (minutes). |
| `MAX_AGE_DAYS` | `30` | Maximum article age to display (days). |
| `PORT` | `3000` | HTTP server port. |

---

## Architecture

```
quantum-news-explorer/
├── server.js              Express app: static files + API route
├── config.js              All tunable settings in one place
├── providers/
│   ├── index.js           Provider fallback chain
│   ├── gnews.js           GNews API (requires key)
│   ├── googleNewsRss.js   Google News RSS (free, no key)
│   └── mock.js            Reads sample-data/articles.json
├── services/
│   ├── filter.js          Relevance + age filtering
│   ├── classify.js        India vs International classification
│   ├── dedupe.js          URL + title deduplication
│   └── cache.js           In-memory cache with TTL
├── public/
│   ├── index.html         Landing page + news UI
│   ├── styles.css         Design system (light/dark themes)
│   └── app.js             Frontend logic (fetch, tabs, cards)
├── sample-data/
│   └── articles.json      12 realistic mock articles
├── tests/                 Unit tests (node:test)
├── .env.example           Template for environment variables
└── package.json
```

### Data Flow

1. **Frontend** clicks "Explore Quantum News" → `GET /api/quantum-news`
2. **Cache check** — serve if fresh; skip to step 7
3. **Provider chain** — try configured → GNews → RSS → Mock
4. **Filter** — keep only articles matching include terms, not matching exclude terms, and ≤ MAX_AGE_DAYS old
5. **Classify** — assign `india` or `international` based on source country, domain, or keywords
6. **Deduplicate** — remove identical URLs and near-identical titles
7. **Respond** — `{ india: [], international: [], fetchedAt, provider, stale }`

---

## How To…

### Add a New Provider

1. Create `providers/myProvider.js` with:
   ```js
   async function fetchArticles({ scope }) { /* return Article[] */ }
   module.exports = { fetchArticles, name: 'myprovider' };
   ```
2. Import it in `providers/index.js` and add it to the `PROVIDERS` map.
3. Set `PROVIDER=myprovider` in `.env` to use it.

### Tune the Relevance Filters

Edit the lists in [`config.js`](config.js):

- **`INCLUDE_TERMS`** — an article must match at least one (e.g. "quantum computing", "qubit").
- **`EXCLUDE_TERMS`** — articles matching any term are dropped (e.g. "quantum of solace", "hyundai quantum").

### Tune India Classification Rules

Edit [`config.js`](config.js):

- **`INDIAN_OUTLETS`** — add/remove domain names of Indian news outlets.
- **`INDIA_KEYWORDS`** — add/remove India-specific terms (cities, orgs, acronyms).

The classification logic itself lives in [`services/classify.js`](services/classify.js) with four prioritized rules.

---

## API

### `GET /api/quantum-news`

Returns:

```jsonc
{
  "india": [
    {
      "id": "...",
      "title": "...",
      "source": "The Hindu",
      "url": "https://...",
      "publishedAt": "2026-10-05T09:30:00Z",
      "snippet": "...",
      "category": "india"
    }
  ],
  "international": [ /* ... */ ],
  "fetchedAt": "2026-10-07T10:34:51Z",
  "provider": "mock",
  "stale": false
}
```

- **Rate limited**: 30 requests/minute per IP.
- **Stale cache**: if the upstream fails, the last good response is served with `stale: true`.

---

## Testing

```bash
npm test
```

Runs unit tests for filter, classify, and dedupe using Node's built-in test runner. Test cases include:
- False-positive rejection ("Hyundai Quantum", "Quantum of Solace")
- Indian outlet covering a foreign story → classified as India
- Duplicate URL and near-identical title removal
- Age boundary checks

---

## Deployment

### Render / Railway

1. Push to a Git repo.
2. Set build command: `npm install`
3. Set start command: `npm start`
4. Add environment variables (`GNEWS_API_KEY`, etc.) in the dashboard.

### Vercel (Serverless)

Vercel doesn't natively run Express. Use the [`vercel-node`](https://vercel.com/docs/functions/serverless-functions/runtimes/node-js) runtime:

1. Create `api/quantum-news.js` that exports the handler.
2. Move static files to `public/`.
3. Add a `vercel.json` with rewrites.

### Docker

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## Assumptions & Limitations

- **No database**: articles are cached in memory and lost on restart.
- **GNews free tier**: ~100 requests/day. RSS is rate-limit-free but may be throttled by Google.
- **Classification heuristic**: domain and keyword-based; not ML-powered. Edge cases may be misclassified.
- **No pagination**: all articles are returned in a single response (typically < 50).
- **No full-text storage**: only title, snippet (≤200 chars), source, date, and URL are stored.

---

## License

MIT
