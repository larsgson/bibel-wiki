// BSB Data API - loads pre-generated BSB Bible data with Strong's numbers
// Data source: /public/bsb-data/base/

// Book code mapping (book number to 3-letter code)
const BOOK_CODES = {
  1: "GEN",
  2: "EXO",
  3: "LEV",
  4: "NUM",
  5: "DEU",
  6: "JOS",
  7: "JDG",
  8: "RUT",
  9: "1SA",
  10: "2SA",
  11: "1KI",
  12: "2KI",
  13: "1CH",
  14: "2CH",
  15: "EZR",
  16: "NEH",
  17: "EST",
  18: "JOB",
  19: "PSA",
  20: "PRO",
  21: "ECC",
  22: "SNG",
  23: "ISA",
  24: "JER",
  25: "LAM",
  26: "EZK",
  27: "DAN",
  28: "HOS",
  29: "JOL",
  30: "AMO",
  31: "OBA",
  32: "JON",
  33: "MIC",
  34: "NAM",
  35: "HAB",
  36: "ZEP",
  37: "HAG",
  38: "ZEC",
  39: "MAL",
  40: "MAT",
  41: "MRK",
  42: "LUK",
  43: "JHN",
  44: "ACT",
  45: "ROM",
  46: "1CO",
  47: "2CO",
  48: "GAL",
  49: "EPH",
  50: "PHP",
  51: "COL",
  52: "1TH",
  53: "2TH",
  54: "1TI",
  55: "2TI",
  56: "TIT",
  57: "PHM",
  58: "HEB",
  59: "JAS",
  60: "1PE",
  61: "2PE",
  62: "1JN",
  63: "2JN",
  64: "3JN",
  65: "JUD",
  66: "REV",
};

// Reverse mapping (code to number)
const BOOK_NUMBERS = Object.fromEntries(
  Object.entries(BOOK_CODES).map(([num, code]) => [code, parseInt(num)]),
);

// Also support common aliases used in the app
const BOOK_ALIASES = {
  GEN: "GEN",
  EXO: "EXO",
  LEV: "LEV",
  NUM: "NUM",
  DEU: "DEU",
  JOS: "JOS",
  JDG: "JDG",
  RUT: "RUT",
  "1SA": "1SA",
  "2SA": "2SA",
  "1KI": "1KI",
  "2KI": "2KI",
  "1CH": "1CH",
  "2CH": "2CH",
  EZR: "EZR",
  NEH: "NEH",
  EST: "EST",
  JOB: "JOB",
  PSA: "PSA",
  PRO: "PRO",
  ECC: "ECC",
  SNG: "SNG",
  SOL: "SNG", // Song of Solomon alias
  ISA: "ISA",
  JER: "JER",
  LAM: "LAM",
  EZK: "EZK",
  EZE: "EZK", // Ezekiel alias
  DAN: "DAN",
  HOS: "HOS",
  JOL: "JOL",
  JOE: "JOL", // Joel alias
  AMO: "AMO",
  OBA: "OBA",
  OBD: "OBA", // Obadiah alias
  JON: "JON",
  MIC: "MIC",
  NAM: "NAM",
  NAH: "NAM", // Nahum alias
  HAB: "HAB",
  ZEP: "ZEP",
  HAG: "HAG",
  ZEC: "ZEC",
  MAL: "MAL",
  MAT: "MAT",
  MRK: "MRK",
  MAR: "MRK", // Mark alias
  LUK: "LUK",
  JHN: "JHN",
  JOH: "JHN", // John alias
  ACT: "ACT",
  ROM: "ROM",
  "1CO": "1CO",
  "2CO": "2CO",
  GAL: "GAL",
  EPH: "EPH",
  PHP: "PHP",
  PHI: "PHP", // Philippians alias
  COL: "COL",
  "1TH": "1TH",
  "2TH": "2TH",
  "1TI": "1TI",
  "2TI": "2TI",
  TIT: "TIT",
  PHM: "PHM",
  HEB: "HEB",
  JAS: "JAS",
  JAM: "JAS", // James alias
  "1PE": "1PE",
  "2PE": "2PE",
  "1JN": "1JN",
  "1JO": "1JN", // 1 John alias
  "2JN": "2JN",
  "2JO": "2JN", // 2 John alias
  "3JN": "3JN",
  "3JO": "3JN", // 3 John alias
  JUD: "JUD",
  JDE: "JUD", // Jude alias
  REV: "REV",
};

// Cache for loaded book data
const bookCache = new Map();

// Cache for bible index (concordance/cross-refs)
const indexCache = new Map();
let indexLoaded = false;

const BSB_DATA_BASE = "/bsb-data/base";

/**
 * Normalize a book code to the standard BSB format
 * @param {string} bookCode - Book code (e.g., 'GEN', 'JOH', 'MAT')
 * @returns {string|null} - Normalized book code or null if not found
 */
export function normalizeBookCode(bookCode) {
  if (!bookCode) return null;
  const upper = bookCode.toUpperCase();
  return BOOK_ALIASES[upper] || null;
}

/**
 * Get book number from book code
 * @param {string} bookCode - Book code (e.g., 'GEN', 'MAT')
 * @returns {number} - Book number (1-66)
 */
export function getBookNumber(bookCode) {
  const normalized = normalizeBookCode(bookCode);
  return normalized ? BOOK_NUMBERS[normalized] || 0 : 0;
}

/**
 * Get book code from book number
 * @param {number} bookNumber - Book number (1-66)
 * @returns {string|null} - Book code or null if invalid
 */
export function getBookCode(bookNumber) {
  return BOOK_CODES[bookNumber] || null;
}

/**
 * Check if a book is in the Old Testament
 * @param {number|string} book - Book number or code
 * @returns {boolean}
 */
export function isOldTestament(book) {
  const num = typeof book === "number" ? book : getBookNumber(book);
  return num >= 1 && num <= 39;
}

/**
 * Load all verses for a book from JSONL file
 * @param {string} bookCode - 3-letter book code
 * @returns {Promise<Array>} - Array of verse objects
 */
async function loadBookData(bookCode) {
  const normalized = normalizeBookCode(bookCode);
  if (!normalized) return [];

  if (bookCache.has(normalized)) {
    return bookCache.get(normalized);
  }

  try {
    const response = await fetch(
      `${BSB_DATA_BASE}/display/${normalized}.jsonl`,
    );
    if (!response.ok) {
      console.error(
        `Failed to load BSB book ${normalized}: ${response.status}`,
      );
      return [];
    }

    const text = await response.text();
    const verses = text
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));

    bookCache.set(normalized, verses);
    return verses;
  } catch (error) {
    console.error(`Error loading BSB book ${normalized}:`, error);
    return [];
  }
}

/**
 * Load a specific chapter from BSB data
 * @param {string} bookCode - 3-letter book code (e.g., 'GEN', 'MAT')
 * @param {number} chapter - Chapter number
 * @returns {Promise<Object|null>} - BSB chapter data or null if not found
 */
export async function loadBSBChapter(bookCode, chapter) {
  const bookData = await loadBookData(bookCode);
  if (!bookData.length) return null;

  const chapterNum = parseInt(chapter, 10);
  const chapterVerses = bookData.filter((v) => v.c === chapterNum);

  if (chapterVerses.length === 0) return null;

  return {
    isBSB: true,
    book: normalizeBookCode(bookCode),
    chapter: chapterNum,
    verses: chapterVerses,
  };
}

/**
 * Extract specific verses from BSB chapter data
 * @param {Object} chapterData - BSB chapter data from loadBSBChapter
 * @param {number} verseStart - Starting verse number
 * @param {number} verseEnd - Ending verse number (same as start for single verse)
 * @param {Array<number>} verses - Optional array of specific verse numbers
 * @returns {Object|null} - Extracted verses in BSB format
 */
export function extractBSBVerses(
  chapterData,
  verseStart,
  verseEnd,
  verses = null,
) {
  if (!chapterData || !chapterData.verses) return null;

  let filteredVerses;

  if (verses && verses.length > 0) {
    // Specific verses (comma-separated in reference)
    filteredVerses = chapterData.verses.filter((v) => verses.includes(v.v));
  } else if (verseStart && verseEnd) {
    // Verse range
    filteredVerses = chapterData.verses.filter(
      (v) => v.v >= verseStart && v.v <= verseEnd,
    );
  } else if (verseStart) {
    // Single verse
    filteredVerses = chapterData.verses.filter((v) => v.v === verseStart);
  } else {
    // Whole chapter
    filteredVerses = chapterData.verses;
  }

  if (filteredVerses.length === 0) return null;

  return {
    isBSB: true,
    book: chapterData.book,
    chapter: chapterData.chapter,
    verses: filteredVerses,
  };
}

/**
 * Convert BSB verse data to plain text (for backwards compatibility)
 * @param {Object} bsbData - BSB verse data
 * @returns {string} - Plain text of verses
 */
export function bsbToPlainText(bsbData) {
  if (!bsbData || !bsbData.verses) return "";

  return bsbData.verses
    .map((verse) => {
      return verse.w
        .map(([text]) => text)
        .join("")
        .trim();
    })
    .join(" ")
    .trim();
}

/**
 * Clear the book cache (useful for testing or memory management)
 */
export function clearBSBCache() {
  bookCache.clear();
  indexCache.clear();
  indexLoaded = false;
}

/**
 * Load the Bible index (for concordance and cross-references)
 * @returns {Promise<void>}
 */
async function loadIndex() {
  if (indexLoaded) return;

  try {
    const response = await fetch(
      `${BSB_DATA_BASE}/index-cc-by/bible-index.jsonl`,
    );
    if (!response.ok) {
      console.error("Failed to load Bible index:", response.status);
      return;
    }

    const text = await response.text();
    for (const line of text.trim().split("\n")) {
      const entry = JSON.parse(line);
      indexCache.set(entry.id, entry);
    }
    indexLoaded = true;
  } catch (error) {
    console.error("Error loading Bible index:", error);
  }
}

/**
 * Search concordance for all verses containing a Strong's number
 * @param {string} strongsNumber - Strong's number (e.g., 'H430', 'G2316')
 * @returns {Promise<Array>} - Array of concordance results
 */
export async function searchConcordance(strongsNumber) {
  await loadIndex();

  const normalized = strongsNumber.toUpperCase();
  const isHebrew = normalized.startsWith("H");
  const results = [];

  indexCache.forEach((entry) => {
    const bookNum = BOOK_NUMBERS[entry.b] || 0;
    const isOT = bookNum >= 1 && bookNum <= 39;

    // Hebrew Strong's only in OT, Greek only in NT
    if (isHebrew !== isOT) return;

    if (entry.s && entry.s.includes(normalized)) {
      results.push({
        id: entry.id,
        bookCode: entry.b,
        bookNumber: bookNum,
        chapter: entry.c,
        verse: entry.v,
        text: entry.t,
      });
    }
  });

  // Sort by book, chapter, verse
  return results.sort(
    (a, b) =>
      a.bookNumber - b.bookNumber || a.chapter - b.chapter || a.verse - b.verse,
  );
}

/**
 * Get cross-references for a specific verse
 * @param {string} bookCode - Book code (e.g., 'GEN')
 * @param {number} chapter - Chapter number
 * @param {number} verse - Verse number
 * @returns {Promise<Array>} - Array of cross-reference strings
 */
export async function getCrossReferences(bookCode, chapter, verse) {
  await loadIndex();

  const normalized = normalizeBookCode(bookCode);
  if (!normalized) return [];

  const verseId = `${normalized}.${chapter}.${verse}`;
  const entry = indexCache.get(verseId);

  return entry?.x || [];
}

/**
 * Get index entry for a specific verse (includes Strong's, cross-refs, morphology)
 * @param {string} bookCode - Book code (e.g., 'GEN')
 * @param {number} chapter - Chapter number
 * @param {number} verse - Verse number
 * @returns {Promise<Object|null>} - Index entry or null
 */
export async function getVerseIndex(bookCode, chapter, verse) {
  await loadIndex();

  const normalized = normalizeBookCode(bookCode);
  if (!normalized) return null;

  const verseId = `${normalized}.${chapter}.${verse}`;
  return indexCache.get(verseId) || null;
}
