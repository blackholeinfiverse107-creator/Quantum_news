/**
 * config.js — Centralised configuration for Quantum News Explorer.
 *
 * All tunable lists (search phrases, relevance filters, Indian outlet
 * domains, India-specific keywords) live here so they are easy to
 * modify without touching application logic.
 */

require('dotenv').config();

module.exports = {
  /* ── Server ──────────────────────────────────────────────── */
  PORT: parseInt(process.env.PORT, 10) || 3000,

  /* ── Provider selection ──────────────────────────────────── */
  GNEWS_API_KEY: process.env.GNEWS_API_KEY || '',
  USE_MOCK: process.env.USE_MOCK === 'true',
  PROVIDER: process.env.PROVIDER || '',           // "gnews" | "rss" | "mock"

  /* ── Cache ───────────────────────────────────────────────── */
  CACHE_MINUTES: parseInt(process.env.CACHE_MINUTES, 10) || 30,

  /* ── Article age limit ───────────────────────────────────── */
  MAX_AGE_DAYS: parseInt(process.env.MAX_AGE_DAYS, 10) || 30,

  /* ── Search phrases sent to providers ────────────────────── */
  SEARCH_PHRASES: [
    'quantum computing',
    'quantum technology',
    'quantum cryptography',
    'quantum communication',
    'quantum sensing',
    'qubit',
  ],

  /* ── Relevance filter: an article's title OR snippet must
       contain at least one of these terms (case-insensitive). ─ */
  INCLUDE_TERMS: [
    'quantum computing',
    'quantum technology',
    'quantum cryptography',
    'quantum communication',
    'quantum sensing',
    'quantum research',
    'quantum processor',
    'quantum internet',
    'quantum network',
    'quantum algorithm',
    'quantum supremacy',
    'quantum advantage',
    'quantum error correction',
    'quantum machine learning',
    'quantum simulation',
    'quantum hardware',
    'quantum software',
    'quantum key distribution',
    'qubit',
    'topological qubit',
  ],

  /* ── Exclude filter: drop articles matching any of these
       (false positives for the word "quantum"). ───────────── */
  EXCLUDE_TERMS: [
    'quantum of solace',
    'quantum leap tv',
    'hyundai quantum',        // car model
    'samsung quantum',        // phone model
    'quantum mutual fund',
    'quantum energy drink',
    'airtel quantum',         // telecom plan
    'jio quantum',            // telecom plan
    'quantum fireball',       // hard-drive brand
    'quantum fishing',
    'quantum break',          // video game
  ],

  /* ── Indian outlet domains (lowercase, no protocol) ─────── */
  INDIAN_OUTLETS: [
    'thehindu.com',
    'indianexpress.com',
    'timesofindia.indiatimes.com',
    'livemint.com',
    'economictimes.indiatimes.com',
    'ndtv.com',
    'hindustantimes.com',
    'business-standard.com',
    'deccanherald.com',
    'thequint.com',
    'scroll.in',
    'theprint.in',
    'moneycontrol.com',
    'news18.com',
    'firstpost.com',
    'wionews.com',
    'telegraphindia.com',
    'newindianexpress.com',
  ],

  /* ── India-specific keywords (case-insensitive match) ───── */
  INDIA_KEYWORDS: [
    'india',
    'indian',
    'national quantum mission',
    'isro',
    'drdo',
    'iit',
    'iisc',
    'tifr',
    'rri',
    'bengaluru',
    'bangalore',
    'hyderabad',
    'mumbai',
    'delhi',
    'chennai',
    'pune',
    'kolkata',
    'c-dac',
    'cdac',
    'meity',
    'dst india',
    'qnu labs',
    'bose institute',
  ],
};
