// Strong's Lexicon API - loads Hebrew and Greek lexicon data
// Data source: /public/data/strongs/lexicon/

// Cache for lexicon data
const lexiconCache = {
  hebrew: null,
  greek: null,
};

const DATA_BASE = '/data/strongs';

/**
 * Load the Hebrew lexicon
 * @returns {Promise<Object>} - Hebrew lexicon entries keyed by Strong's number
 */
async function loadHebrewLexicon() {
  if (lexiconCache.hebrew) return lexiconCache.hebrew;

  try {
    const response = await fetch(`${DATA_BASE}/lexicon/hebrew.json`);
    if (!response.ok) {
      console.error(`Failed to load Hebrew lexicon: ${response.status}`);
      return {};
    }
    const data = await response.json();
    lexiconCache.hebrew = data;
    return data;
  } catch (error) {
    console.error('Error loading Hebrew lexicon:', error);
    return {};
  }
}

/**
 * Load the Greek lexicon
 * @returns {Promise<Object>} - Greek lexicon entries keyed by Strong's number
 */
async function loadGreekLexicon() {
  if (lexiconCache.greek) return lexiconCache.greek;

  try {
    const response = await fetch(`${DATA_BASE}/lexicon/greek.json`);
    if (!response.ok) {
      console.error(`Failed to load Greek lexicon: ${response.status}`);
      return {};
    }
    const data = await response.json();
    lexiconCache.greek = data;
    return data;
  } catch (error) {
    console.error('Error loading Greek lexicon:', error);
    return {};
  }
}

/**
 * Get a single lexicon entry by Strong's number
 * @param {string} strongsNumber - Strong's number (e.g., 'H1234' or 'G5678')
 * @returns {Promise<Object|null>} - Lexicon entry or null if not found
 */
export async function getLexiconEntry(strongsNumber) {
  if (!strongsNumber) return null;

  const normalized = strongsNumber.toUpperCase();
  const isHebrew = normalized.startsWith('H');

  const lexicon = isHebrew
    ? await loadHebrewLexicon()
    : await loadGreekLexicon();

  return lexicon[normalized] || null;
}

/**
 * Get multiple lexicon entries at once
 * @param {string[]} strongsNumbers - Array of Strong's numbers
 * @returns {Promise<Object>} - Object with Strong's numbers as keys and entries as values
 */
export async function getLexiconEntries(strongsNumbers) {
  if (!strongsNumbers || strongsNumbers.length === 0) return {};

  // Load both lexicons in parallel for efficiency
  const [hebrew, greek] = await Promise.all([
    loadHebrewLexicon(),
    loadGreekLexicon(),
  ]);

  const results = {};
  for (const num of strongsNumbers) {
    if (!num) continue;
    const normalized = num.toUpperCase();
    const entry = normalized.startsWith('H') ? hebrew[normalized] : greek[normalized];
    if (entry) results[normalized] = entry;
  }

  return results;
}

/**
 * Check if a Strong's number is Hebrew
 * @param {string} strongsNumber - Strong's number
 * @returns {boolean}
 */
export function isHebrewStrongs(strongsNumber) {
  return strongsNumber && strongsNumber.toUpperCase().startsWith('H');
}

/**
 * Check if a Strong's number is Greek
 * @param {string} strongsNumber - Strong's number
 * @returns {boolean}
 */
export function isGreekStrongs(strongsNumber) {
  return strongsNumber && strongsNumber.toUpperCase().startsWith('G');
}

/**
 * Get the language label for a Strong's number
 * @param {string} strongsNumber - Strong's number
 * @returns {string} - 'Hebrew' or 'Greek'
 */
export function getStrongsLanguage(strongsNumber) {
  return isHebrewStrongs(strongsNumber) ? 'Hebrew' : 'Greek';
}

/**
 * Clear the lexicon cache (useful for testing or memory management)
 */
export function clearLexiconCache() {
  lexiconCache.hebrew = null;
  lexiconCache.greek = null;
}

/**
 * Preload both lexicons (useful for interlinear modes)
 * @returns {Promise<void>}
 */
export async function preloadLexicons() {
  await Promise.all([loadHebrewLexicon(), loadGreekLexicon()]);
}
