/**
 * tests/filter.test.js — Unit tests for the relevance & age filter.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { isRelevant, isRecent } = require('../services/filter');

describe('filter — isRelevant', () => {
  it('keeps an article about quantum computing', () => {
    const article = {
      title: 'Google achieves quantum computing milestone',
      snippet: 'New qubit architecture surpasses previous records.',
    };
    assert.equal(isRelevant(article), true);
  });

  it('rejects a false-positive "quantum" article (car model)', () => {
    const article = {
      title: 'Hyundai Quantum SUV review: a quantum leap in comfort',
      snippet: 'The new Hyundai Quantum offers premium features at a budget price.',
    };
    assert.equal(isRelevant(article), false);
  });

  it('rejects an article with no quantum include terms', () => {
    const article = {
      title: 'Stock market rallies on tech earnings',
      snippet: 'Major indexes gained 2% in a broad rally.',
    };
    assert.equal(isRelevant(article), false);
  });

  it('rejects "Quantum of Solace" article', () => {
    const article = {
      title: 'Quantum of Solace remains a divisive Bond film',
      snippet: 'Fans revisit the quantum of solace debate after 18 years.',
    };
    assert.equal(isRelevant(article), false);
  });

  it('keeps a quantum sensing article', () => {
    const article = {
      title: 'Quantum sensing detects underground tunnels',
      snippet: 'UK startup uses cold-atom quantum sensing to map infrastructure.',
    };
    assert.equal(isRelevant(article), true);
  });
});

describe('filter — isRecent', () => {
  it('keeps an article from today', () => {
    const article = { publishedAt: new Date().toISOString() };
    assert.equal(isRecent(article, 30), true);
  });

  it('rejects an article older than MAX_AGE_DAYS', () => {
    const old = new Date();
    old.setDate(old.getDate() - 31);
    const article = { publishedAt: old.toISOString() };
    assert.equal(isRecent(article, 30), false);
  });

  it('rejects an article with an invalid date', () => {
    const article = { publishedAt: 'not-a-date' };
    assert.equal(isRecent(article, 30), false);
  });
});
