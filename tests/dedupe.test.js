/**
 * tests/dedupe.test.js — Unit tests for article deduplication.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { deduplicateArticles, normalizeUrl, normalizeTitle } = require('../services/dedupe');

describe('dedupe — normalizeUrl', () => {
  it('strips protocol, www, and trailing slash', () => {
    assert.equal(
      normalizeUrl('https://www.example.com/article/'),
      'example.com/article'
    );
  });

  it('strips query string and fragment via URL parsing', () => {
    // normalizeUrl keeps path only
    assert.equal(
      normalizeUrl('https://example.com/a?ref=twitter#top'),
      'example.com/a'
    );
  });
});

describe('dedupe — normalizeTitle', () => {
  it('lowercases and strips punctuation', () => {
    assert.equal(
      normalizeTitle('IBM Reveals: 1000-Qubit Quantum Roadmap!'),
      'ibm reveals 1000qubit quantum roadmap'
    );
  });
});

describe('dedupe — deduplicateArticles', () => {
  it('removes articles with duplicate URLs (different protocols)', () => {
    const articles = [
      { title: 'Article A', url: 'https://example.com/a', snippet: '' },
      { title: 'Article B', url: 'http://www.example.com/a', snippet: '' },
    ];
    const result = deduplicateArticles(articles);
    assert.equal(result.length, 1);
    assert.equal(result[0].title, 'Article A');
  });

  it('removes articles with near-identical titles', () => {
    const articles = [
      { title: 'Google Achieves Quantum Milestone!', url: 'https://a.com/1', snippet: '' },
      { title: 'Google achieves quantum milestone', url: 'https://b.com/2', snippet: '' },
    ];
    const result = deduplicateArticles(articles);
    assert.equal(result.length, 1);
  });

  it('keeps articles with different titles and URLs', () => {
    const articles = [
      { title: 'Article A', url: 'https://a.com/1', snippet: '' },
      { title: 'Article B', url: 'https://b.com/2', snippet: '' },
    ];
    const result = deduplicateArticles(articles);
    assert.equal(result.length, 2);
  });
});
