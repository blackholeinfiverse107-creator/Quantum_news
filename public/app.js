/**
 * app.js — Frontend logic for Quantum News Explorer.
 *
 * All article data is inserted via textContent or proper escaping —
 * no unescaped innerHTML with API data.
 */

(function () {
  'use strict';

  /* ── DOM references ──────────────────────────────────── */
  const $landing      = document.getElementById('landing');
  const $exploreBtn   = document.getElementById('explore-btn');
  const $newsSection  = document.getElementById('news-section');
  const $backBtn      = document.getElementById('back-btn');
  const $refreshBtn   = document.getElementById('refresh-btn');
  const $updateTime   = document.getElementById('update-time');
  const $loading      = document.getElementById('loading');
  const $errorState   = document.getElementById('error-state');
  const $errorMessage = document.getElementById('error-message');
  const $retryBtn     = document.getElementById('retry-btn');
  const $staleNotice  = document.getElementById('stale-notice');
  const $providerBadge = document.getElementById('provider-badge');
  const $tabIndia     = document.getElementById('tab-india');
  const $tabIntl      = document.getElementById('tab-international');
  const $countIndia   = document.getElementById('count-india');
  const $countIntl    = document.getElementById('count-international');
  const $panelIndia   = document.getElementById('panel-india');
  const $panelIntl    = document.getElementById('panel-international');
  const $articlesIndia = document.getElementById('articles-india');
  const $articlesIntl  = document.getElementById('articles-international');

  /* ── State ───────────────────────────────────────────── */
  let activeTab = 'india';

  /* ── Helpers ─────────────────────────────────────────── */

  /**
   * Format an ISO date string to "07 Oct 2026" style.
   * @param {string} iso
   * @returns {string}
   */
  function formatDate(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  }

  /**
   * Create an article card element. All data is inserted via textContent.
   * @param {object} article
   * @returns {HTMLElement}
   */
  function createCard(article) {
    const card = document.createElement('article');
    card.className = 'article-card';

    // Title with link
    const titleEl = document.createElement('h3');
    titleEl.className = 'article-card__title';
    const linkEl = document.createElement('a');
    linkEl.href = article.url;
    linkEl.target = '_blank';
    linkEl.rel = 'noopener noreferrer';
    linkEl.textContent = article.title;
    titleEl.appendChild(linkEl);

    // Meta: source + date
    const metaEl = document.createElement('div');
    metaEl.className = 'article-card__meta';

    const sourceEl = document.createElement('span');
    sourceEl.className = 'article-card__source';
    sourceEl.textContent = article.source;

    const dotEl = document.createElement('span');
    dotEl.className = 'article-card__dot';
    dotEl.setAttribute('aria-hidden', 'true');

    const dateEl = document.createElement('time');
    dateEl.dateTime = article.publishedAt;
    dateEl.textContent = formatDate(article.publishedAt);

    metaEl.appendChild(sourceEl);
    metaEl.appendChild(dotEl);
    metaEl.appendChild(dateEl);

    // Snippet
    const snippetEl = document.createElement('p');
    snippetEl.className = 'article-card__snippet';
    snippetEl.textContent =
      article.snippet.length > 200
        ? article.snippet.slice(0, 197) + '…'
        : article.snippet;

    card.appendChild(titleEl);
    card.appendChild(metaEl);
    card.appendChild(snippetEl);

    return card;
  }

  /**
   * Create an empty-state message element.
   * @param {string} message
   * @returns {HTMLElement}
   */
  function createEmptyState(message) {
    const div = document.createElement('div');
    div.className = 'empty-state';

    const icon = document.createElement('div');
    icon.className = 'empty-state__icon';
    icon.textContent = '📭';

    const text = document.createElement('p');
    text.className = 'empty-state__text';
    text.textContent = message;

    div.appendChild(icon);
    div.appendChild(text);
    return div;
  }

  /**
   * Render articles into a container.
   * @param {HTMLElement} container
   * @param {object[]} articles
   * @param {string} emptyMsg
   */
  function renderArticles(container, articles, emptyMsg) {
    container.innerHTML = ''; // safe — we don't insert API data here

    if (!articles || articles.length === 0) {
      container.appendChild(createEmptyState(emptyMsg));
      return;
    }

    articles.forEach((article) => {
      container.appendChild(createCard(article));
    });
  }

  /* ── Show / hide helpers ─────────────────────────────── */

  function showView(view) {
    $landing.classList.add('hidden');
    $newsSection.classList.add('hidden');
    $loading.classList.add('hidden');
    $errorState.classList.add('hidden');

    if (view === 'landing') $landing.classList.remove('hidden');
    if (view === 'news')    $newsSection.classList.remove('hidden');
    if (view === 'loading') $loading.classList.remove('hidden');
    if (view === 'error')   $errorState.classList.remove('hidden');
  }

  /* ── Tab switching ───────────────────────────────────── */

  function switchTab(tab) {
    activeTab = tab;

    // Update ARIA + classes
    if (tab === 'india') {
      $tabIndia.classList.add('tab--active');
      $tabIndia.setAttribute('aria-selected', 'true');
      $tabIndia.setAttribute('tabindex', '0');
      $tabIntl.classList.remove('tab--active');
      $tabIntl.setAttribute('aria-selected', 'false');
      $tabIntl.setAttribute('tabindex', '-1');
      $panelIndia.classList.remove('hidden');
      $panelIntl.classList.add('hidden');
    } else {
      $tabIntl.classList.add('tab--active');
      $tabIntl.setAttribute('aria-selected', 'true');
      $tabIntl.setAttribute('tabindex', '0');
      $tabIndia.classList.remove('tab--active');
      $tabIndia.setAttribute('aria-selected', 'false');
      $tabIndia.setAttribute('tabindex', '-1');
      $panelIntl.classList.remove('hidden');
      $panelIndia.classList.add('hidden');
    }
  }

  /* ── Keyboard navigation for tabs ────────────────────── */
  function handleTabKeydown(e) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const next = activeTab === 'india' ? 'international' : 'india';
      switchTab(next);
      (next === 'india' ? $tabIndia : $tabIntl).focus();
    }
  }

  /* ── Fetch and render ────────────────────────────────── */

  async function fetchAndRender(forceRefresh = false) {
    showView('loading');

    try {
      const url = forceRefresh ? '/api/quantum-news?refresh=true' : '/api/quantum-news';
      const res = await fetch(url);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      const data = await res.json();

      // Counts
      $countIndia.textContent = data.india ? data.india.length : 0;
      $countIntl.textContent = data.international ? data.international.length : 0;

      // Provider badge
      $providerBadge.textContent = `via ${data.provider || 'unknown'}`;

      // Update timestamp display
      if (data.fetchedAt && $updateTime) {
        try {
          const dt = new Date(data.fetchedAt);
          $updateTime.textContent = 'Updated ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {
          $updateTime.textContent = '';
        }
      }

      // Stale notice
      if (data.stale) {
        $staleNotice.classList.remove('hidden');
      } else {
        $staleNotice.classList.add('hidden');
      }

      // Render articles
      renderArticles(
        $articlesIndia,
        data.india,
        'No quantum news from India at the moment.'
      );
      renderArticles(
        $articlesIntl,
        data.international,
        'No international quantum news at the moment.'
      );

      // Default to India tab
      switchTab('india');
      showView('news');
    } catch (err) {
      console.error('Fetch error:', err);
      $errorMessage.textContent =
        err.message || 'Something went wrong. Please try again.';
      showView('error');
    }
  }

  /* ── Event listeners ─────────────────────────────────── */

  $exploreBtn.addEventListener('click', () => fetchAndRender(false));
  $retryBtn.addEventListener('click', () => fetchAndRender(true));
  if ($refreshBtn) {
    $refreshBtn.addEventListener('click', () => fetchAndRender(true));
  }

  $backBtn.addEventListener('click', () => {
    showView('landing');
  });

  $tabIndia.addEventListener('click', () => switchTab('india'));
  $tabIntl.addEventListener('click', () => switchTab('international'));

  $tabIndia.addEventListener('keydown', handleTabKeydown);
  $tabIntl.addEventListener('keydown', handleTabKeydown);
})();
