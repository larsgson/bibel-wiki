/**
 * Shared utility functions for language learning exercises.
 */

/**
 * Fisher-Yates shuffle — returns a new shuffled array.
 */
export const shuffleArray = (arr) => {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/**
 * Split verse text into words, filtering empty strings.
 */
export const getWordsFromVerse = (text) => {
  if (!text || typeof text !== "string") return [];
  return text.split(/\s+/).filter(Boolean);
};

/**
 * Generate distractor texts from nearby verses for multiple-choice exercises.
 * Returns an array of plain text strings (excluding the current verse).
 */
export const generateDistractors = (allVerseTexts, currentIndex, count = 2) => {
  const candidates = [];
  const maxRange = Math.max(currentIndex, allVerseTexts.size - currentIndex);

  for (let offset = 1; offset <= maxRange; offset++) {
    if (candidates.length >= count * 3) break;
    const before = currentIndex - offset;
    const after = currentIndex + offset;
    if (before >= 0 && allVerseTexts.has(before)) {
      const text = allVerseTexts.get(before);
      if (text) candidates.push(text);
    }
    if (after < allVerseTexts.size && allVerseTexts.has(after)) {
      const text = allVerseTexts.get(after);
      if (text) candidates.push(text);
    }
  }

  return shuffleArray(candidates).slice(0, count);
};

/**
 * Pick indices of content words suitable for blanking in fill-gap exercises.
 * Skips short words (<=3 chars) to avoid trivially guessable gaps.
 */
export const pickGapWords = (words, count = 2) => {
  const contentWordIndices = words
    .map((word, index) => ({ word, index }))
    .filter(({ word }) => word.replace(/[.,;:!?'"()]/g, "").length > 3)
    .map(({ index }) => index);

  if (contentWordIndices.length === 0) {
    // Fallback: pick any word indices if no long words exist
    return shuffleArray(words.map((_, i) => i)).slice(0, Math.min(count, words.length));
  }

  return shuffleArray(contentWordIndices).slice(0, Math.min(count, contentWordIndices.length));
};
