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
 * Extract specific verses from chapter data
 * Supports three formats:
 * 1. String (legacy) - returns as-is
 * 2. DBT API format - Array of { num, text }
 * 3. BSB format - { isBSB: true, verses: [{ v, w: [[text, strongs], ...] }] }
 *
 * @param {Array|string|Object} chapterData - Chapter data in any supported format
 * @param {number} verseStart - Start verse number (if range)
 * @param {number} verseEnd - End verse number (if range)
 * @param {Array} verses - Array of specific verse numbers (if comma-separated)
 * @returns {string|Object|null} Extracted verse text (string) or BSB data (object) or null
 */
export const extractVerses = (
  chapterData,
  verseStart,
  verseEnd,
  verses = null,
) => {
  if (!chapterData) return null;

  // If it's a string (old format), return it as-is
  if (typeof chapterData === "string") {
    return chapterData;
  }

  // If it's BSB format
  if (chapterData.isBSB && chapterData.verses) {
    let selectedVerses;

    // Handle comma-separated verses (specific verse numbers)
    if (verses && Array.isArray(verses)) {
      selectedVerses = chapterData.verses.filter((v) => verses.includes(v.v));
    } else if (verseStart && verseEnd) {
      // Handle range
      selectedVerses = chapterData.verses.filter(
        (v) => v.v >= verseStart && v.v <= verseEnd,
      );
    } else if (verseStart) {
      // Single verse
      selectedVerses = chapterData.verses.filter((v) => v.v === verseStart);
    } else {
      // No verse filter - return all
      selectedVerses = chapterData.verses;
    }

    if (selectedVerses.length === 0) {
      return null;
    }

    // Return BSB structure for rendering with clickable words
    return {
      isBSB: true,
      book: chapterData.book,
      chapter: chapterData.chapter,
      verses: selectedVerses,
    };
  }

  // If it's an array (DBT API format)
  if (Array.isArray(chapterData)) {
    let selectedVerses;

    // Handle comma-separated verses (specific verse numbers)
    if (verses && Array.isArray(verses)) {
      selectedVerses = chapterData.filter((v) => verses.includes(v.num));
    } else {
      // Handle range
      selectedVerses = chapterData.filter(
        (v) => v.num >= verseStart && v.num <= verseEnd,
      );
    }

    if (selectedVerses.length === 0) {
      return null;
    }

    // Format without verse numbers - return plain text
    return selectedVerses
      .map((v) => v.text)
      .join(" ")
      .trim();
  }

  return null;
};

/**
 * Convert BSB verse data to plain text
 * @param {Object} bsbData - BSB verse data with { isBSB: true, verses: [...] }
 * @returns {string} Plain text of verses
 */
export const bsbToPlainText = (bsbData) => {
  if (!bsbData || !bsbData.isBSB || !bsbData.verses) {
    return typeof bsbData === "string" ? bsbData : "";
  }

  return bsbData.verses
    .map((verse) => {
      return verse.w
        .map(([text]) => text)
        .join("")
        .trim();
    })
    .join(" ")
    .trim();
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
 * @returns {string|Object|null} Extracted text (string), BSB data (object with combined verses), or null
 */
export const getTextForReference = (reference, chapterText) => {
  if (!reference || !chapterText) return null;

  // Split into individual references (handles multi-reference strings)
  const refs = splitReference(reference);
  if (refs.length === 0) return null;

  const textParts = [];
  const bsbVerses = []; // Collect all BSB verses for combined result
  let hasBSBData = false;

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
      // Check if this is BSB format
      if (typeof extractedVerses === "object" && extractedVerses.isBSB) {
        hasBSBData = true;
        // Collect all verses from this BSB result
        if (extractedVerses.verses && Array.isArray(extractedVerses.verses)) {
          bsbVerses.push(...extractedVerses.verses);
        }
      } else {
        // Plain text result
        textParts.push(extractedVerses);
      }
    }
  }

  // If we have BSB data, return combined BSB object with all verses
  if (hasBSBData && bsbVerses.length > 0) {
    return {
      isBSB: true,
      verses: bsbVerses,
    };
  }

  return textParts.length > 0 ? textParts.join(" ") : null;
};
