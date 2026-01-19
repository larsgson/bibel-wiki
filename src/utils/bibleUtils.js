/**
 * Shared utilities for Bible reference parsing and verse extraction
 */

/**
 * Book code aliases - maps alternative codes to standard codes
 * The DBT API uses specific book codes, but some sources may use alternatives
 */
const BOOK_CODE_ALIASES = {
  JOH: "JHN", // John's Gospel - some sources use JOH instead of JHN
};

/**
 * Normalize a book code to the standard form used by the DBT API
 * @param {string} bookCode - The book code to normalize
 * @returns {string} The normalized book code
 */
export const normalizeBookCode = (bookCode) => {
  if (!bookCode) return bookCode;
  const upper = bookCode.toUpperCase();
  return BOOK_CODE_ALIASES[upper] || upper;
};

/**
 * Determine testament from book code
 * @param {string} bookCode - The book code (e.g., "MAT", "GEN")
 * @returns {string} "nt" or "ot"
 */
export const getTestament = (bookCode) => {
  const ntBooks = [
    "MAT",
    "MRK",
    "LUK",
    "JHN",
    "JOH", // Alias for JHN (John)
    "ACT",
    "ROM",
    "1CO",
    "2CO",
    "GAL",
    "EPH",
    "PHP",
    "COL",
    "1TH",
    "2TH",
    "1TI",
    "2TI",
    "TIT",
    "PHM",
    "HEB",
    "JAS",
    "1PE",
    "2PE",
    "1JN",
    "2JN",
    "3JN",
    "JUD",
    "REV",
  ];
  return ntBooks.includes(bookCode.toUpperCase()) ? "nt" : "ot";
};

/**
 * Parse a Bible reference string into book, chapter, and verse range
 * Examples: "GEN 1:1-5", "MAT 5:3", "REV 21:1-4", "GEN 1:20,22" (comma = non-consecutive verses)
 * @param {string} reference - The Bible reference string
 * @returns {Object|null} Parsed reference object or null if invalid
 */
export const parseReference = (reference) => {
  if (!reference) return null;

  // Match pattern: BOOK CHAPTER:VERSES where VERSES can be "1", "1-5", or "1,3,5"
  const match = reference.match(/^([A-Z0-9]+)\s+(\d+):(.+)$/i);
  if (!match) {
    return null;
  }

  // Normalize the book code (e.g., JOH -> JHN)
  const book = normalizeBookCode(match[1]);
  const chapter = parseInt(match[2], 10);
  const versePart = match[3];

  // Check if it's comma-separated (individual verses)
  if (versePart.includes(",")) {
    const verses = versePart.split(",").map((v) => parseInt(v.trim(), 10));
    return {
      book,
      chapter,
      verses, // Array of specific verse numbers
    };
  }

  // Check if it's a range (e.g., "1-5")
  if (versePart.includes("-")) {
    const [start, end] = versePart
      .split("-")
      .map((v) => parseInt(v.trim(), 10));
    return {
      book,
      chapter,
      verseStart: start,
      verseEnd: end,
    };
  }

  // Single verse
  const verse = parseInt(versePart, 10);
  return {
    book,
    chapter,
    verseStart: verse,
    verseEnd: verse,
  };
};

/**
 * Extract specific verses from chapter verse array
 * @param {Array|string} verseArray - Array of verse objects with num and text, or string (old format)
 * @param {number} verseStart - Start verse number (if range)
 * @param {number} verseEnd - End verse number (if range)
 * @param {Array} verses - Array of specific verse numbers (if comma-separated)
 * @returns {string|null} Extracted verse text or null
 */
export const extractVerses = (
  verseArray,
  verseStart,
  verseEnd,
  verses = null,
) => {
  if (!verseArray) return null;

  // If it's a string (old format), return it as-is
  if (typeof verseArray === "string") {
    return verseArray;
  }

  // If it's an array (new format from DBT API)
  if (Array.isArray(verseArray)) {
    let selectedVerses;

    // Handle comma-separated verses (specific verse numbers)
    if (verses && Array.isArray(verses)) {
      selectedVerses = verseArray.filter((v) => verses.includes(v.num));
    } else {
      // Handle range
      selectedVerses = verseArray.filter(
        (v) => v.num >= verseStart && v.num <= verseEnd,
      );
    }

    if (selectedVerses.length === 0) {
      return null;
    }

    // Format without verse numbers
    return selectedVerses
      .map((v) => v.text)
      .join(" ")
      .trim();
  }

  return null;
};

/**
 * Split a complex reference into individual reference parts
 * Handles multi-reference strings like "MAT 3:4,LUK 3:2-4"
 * @param {string} reference - The reference string to split
 * @returns {Array} Array of individual reference strings
 */
export const splitReference = (reference) => {
  if (!reference) return [];

  const parts = reference.split(",").map((p) => p.trim());
  const results = [];

  let currentBook = null;
  let currentChapter = null;

  parts.forEach((part) => {
    const bookMatch = part.match(/^([A-Z0-9]+)\s*(\d+):(.+)$/i);

    if (bookMatch) {
      // Normalize the book code (e.g., JOH -> JHN)
      currentBook = normalizeBookCode(bookMatch[1]);
      currentChapter = bookMatch[2];
      const verses = bookMatch[3];
      results.push(`${currentBook} ${currentChapter}:${verses}`);
    } else {
      const chapterMatch = part.match(/^(\d+):(.+)$/);

      if (chapterMatch) {
        currentChapter = chapterMatch[1];
        const verses = chapterMatch[2];
        results.push(`${currentBook} ${currentChapter}:${verses}`);
      } else {
        // Just verse numbers - use current book and chapter
        results.push(`${currentBook} ${currentChapter}:${part}`);
      }
    }
  });

  return results;
};

/**
 * Extract Bible text for a given reference from the chapterText cache
 * Handles both single references (e.g., "MAT 1:18-19") and multi-references (e.g., "MAT 3:4,LUK 3:2-4")
 * @param {string} reference - Bible reference (e.g., "MAT 1:18-19" or "MAT 3:4,LUK 3:2-4")
 * @param {Object} chapterText - Cache of loaded chapters
 * @returns {string|null} Extracted text or null
 */
export const getTextForReference = (reference, chapterText) => {
  if (!reference || !chapterText) return null;

  // Split into individual references (handles multi-reference strings)
  const refs = splitReference(reference);
  if (refs.length === 0) return null;

  const textParts = [];

  for (const ref of refs) {
    const parsed = parseReference(ref);
    if (!parsed) continue;

    const { book, chapter, verseStart, verseEnd, verses } = parsed;
    const chapterKey = `${book}.${chapter}`;

    if (!chapterText[chapterKey]) {
      continue;
    }

    const extractedVerses = extractVerses(
      chapterText[chapterKey],
      verseStart,
      verseEnd,
      verses,
    );

    if (extractedVerses) {
      textParts.push(extractedVerses);
    }
  }

  return textParts.length > 0 ? textParts.join(" ") : null;
};
