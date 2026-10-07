/**
 * tests/classify.test.js — Unit tests for India vs International classifier.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { classifyArticle } = require('../services/classify');

describe('classify — classifyArticle', () => {
  it('marks an article with _sourceCountry "in" as india', () => {
    const article = {
      title: 'Some tech news',
      snippet: 'Unrelated snippet about technology.',
      url: 'https://example.com/article',
      _sourceCountry: 'in',
      category: null,
    };
    assert.equal(classifyArticle(article), 'india');
    assert.equal(article.category, 'india');
  });

  it('marks an article from an Indian outlet domain as india', () => {
    const article = {
      title: 'Quantum research advances worldwide',
      snippet: 'International teams make progress.',
      url: 'https://www.thehindu.com/sci-tech/quantum-research.html',
      _sourceCountry: null,
      category: null,
    };
    assert.equal(classifyArticle(article), 'india');
  });

  it('marks an article mentioning ISRO as india even from a foreign outlet', () => {
    const article = {
      title: 'ISRO plans quantum satellite experiment',
      snippet: 'The Indian space agency is testing quantum communication.',
      url: 'https://www.reuters.com/space/isro-quantum.html',
      _sourceCountry: null,
      category: null,
    };
    assert.equal(classifyArticle(article), 'india');
  });

  it('classifies an Indian outlet covering a foreign story as india (domain rule)', () => {
    // This is a key spec case: an Indian outlet covering international news
    // should still be classified as "india" because of the domain rule.
    const article = {
      title: 'Google launches new quantum processor in California',
      snippet: 'Google unveils its latest quantum chip at its US lab.',
      url: 'https://www.ndtv.com/world-news/google-quantum-processor',
      _sourceCountry: null,
      category: null,
    };
    assert.equal(classifyArticle(article), 'india');
  });

  it('marks a foreign article with no India signals as international', () => {
    const article = {
      title: 'IBM reveals 1000-qubit quantum roadmap',
      snippet: 'IBM outlines its plan for quantum computing dominance.',
      url: 'https://www.techcrunch.com/ibm-quantum',
      _sourceCountry: null,
      category: null,
    };
    assert.equal(classifyArticle(article), 'international');
  });

  it('does not false-positive "indicated" as India', () => {
    const article = {
      title: 'Results indicated quantum advantage',
      snippet: 'Researchers indicated their findings were significant.',
      url: 'https://www.nature.com/quantum-advantage',
      _sourceCountry: null,
      category: null,
    };
    assert.equal(classifyArticle(article), 'international');
  });
});
