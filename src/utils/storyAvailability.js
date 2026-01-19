/**
 * Story content availability utilities
 * Determines what TEXT content is available for a story in a given language
 */

/**
 * Calculate text availability for a story across multiple languages
 * A story is considered "full" if the non-fallback languages can cover all required testaments
 * @param {Object} storyMetadata - Cached story metadata with testaments info
 * @param {Object} languageDataMap - Map of language codes to language data
 * @param {Array} selectedLanguages - Array of selected language codes (fallback is last)
 * @returns {Object} Availability status
 */
export const getStoryAvailabilityMultiLang = (
  storyMetadata,
  languageDataMap,
  selectedLanguages,
) => {
  // If no selected languages, return unknown
  if (!selectedLanguages || selectedLanguages.length === 0) {
    return {
      status: "unknown",
      hasText: false,
      missingTestaments: [],
      availableTestaments: [],
    };
  }

  // Non-fallback languages: exclude the last language if it's 'eng' (the fallback)
  // and there are other languages available
  const lastLang = selectedLanguages[selectedLanguages.length - 1];
  const isFallbackPresent = lastLang === "eng" && selectedLanguages.length > 1;
  const nonFallbackLanguages = isFallbackPresent
    ? selectedLanguages.slice(0, -1)
    : selectedLanguages;

  // If no metadata, return unknown
  if (!storyMetadata?.testaments) {
    return {
      status: "unknown",
      hasText: false,
      missingTestaments: [],
      availableTestaments: [],
    };
  }

  const testaments = storyMetadata.testaments;

  // If story uses no testaments, it's empty
  if (!testaments.usesOT && !testaments.usesNT) {
    return {
      status: "empty",
      hasText: false,
      missingTestaments: [],
      availableTestaments: [],
    };
  }

  // Check which testaments are needed
  const testamentsNeeded = [];
  if (testaments.usesOT) testamentsNeeded.push("ot");
  if (testaments.usesNT) testamentsNeeded.push("nt");

  const availableTestaments = [];

  // For each needed testament, check if ANY non-fallback language can cover it
  for (const testament of testamentsNeeded) {
    const isCovered = nonFallbackLanguages.some((langCode) => {
      const langData = languageDataMap[langCode];
      if (!langData) return false;

      const testamentData = langData[testament];
      if (!testamentData) return false;

      // Check if testament has TEXT fileset
      const hasText = !!testamentData.filesetId;

      // Check if testament has AUDIO with timecode
      const hasAudioWithTimecode =
        testamentData.audioFilesetId &&
        (testamentData.audioCategory === "audio-with-timecode" ||
          testamentData.audioCategory === "with-timecode");

      return hasText || hasAudioWithTimecode;
    });

    if (isCovered) {
      availableTestaments.push(testament);
    }
  }

  const missingTestaments = testamentsNeeded.filter(
    (t) => !availableTestaments.includes(t),
  );

  // Determine status:
  // - "full" if all needed testaments are covered
  // - "partial" if some (but not all) needed testaments are covered
  // - "empty" if no needed testaments are covered
  let status;
  if (missingTestaments.length === 0) {
    status = "full";
  } else if (availableTestaments.length > 0) {
    status = "partial";
  } else {
    status = "empty";
  }
  const hasText = missingTestaments.length === 0;

  return {
    status,
    hasText,
    missingTestaments,
    availableTestaments,
  };
};

/**
 * Calculate text availability for a story (single language - legacy)
 * @param {Object} storyMetadata - Cached story metadata with testaments info
 * @param {Object} languageData - Language data with OT/NT text filesets
 * @returns {Object} Availability status
 */
export const getStoryAvailability = (storyMetadata, languageData) => {
  // Default to unknown if no language data
  if (!languageData) {
    return {
      status: "unknown",
      hasText: false,
      missingTestaments: [],
      availableTestaments: [],
    };
  }

  // If no metadata, return unknown - don't assume both testaments are needed
  // This prevents filtering out stories before metadata is loaded
  if (!storyMetadata?.testaments) {
    return {
      status: "unknown",
      hasText: false,
      missingTestaments: [],
      availableTestaments: [],
    };
  }

  const testaments = storyMetadata.testaments;

  // If story uses no testaments, it's empty (shouldn't happen, but handle it)
  if (!testaments.usesOT && !testaments.usesNT) {
    return {
      status: "empty",
      hasText: false,
      missingTestaments: [],
      availableTestaments: [],
    };
  }

  // Check which testaments are needed
  const testamentsNeeded = [];
  if (testaments.usesOT) testamentsNeeded.push("ot");
  if (testaments.usesNT) testamentsNeeded.push("nt");

  const missingTestaments = [];
  const availableTestaments = [];

  // Check text OR audio availability for each needed testament
  for (const testament of testamentsNeeded) {
    const testamentData = languageData[testament];

    if (!testamentData) {
      missingTestaments.push(testament);
      continue;
    }

    // Check if testament has TEXT fileset
    const hasText = !!testamentData.filesetId;

    // Check if testament has AUDIO with timecode (can play audio stories without text)
    const hasAudioWithTimecode =
      testamentData.audioFilesetId &&
      (testamentData.audioCategory === "audio-with-timecode" ||
        testamentData.audioCategory === "with-timecode");

    // Testament is available if it has either text OR audio with timecode
    if (hasText || hasAudioWithTimecode) {
      availableTestaments.push(testament);
    } else {
      missingTestaments.push(testament);
    }
  }

  // Determine status: empty if ANY required testament is missing content, otherwise full
  const status = missingTestaments.length > 0 ? "empty" : "full";
  const hasText = missingTestaments.length === 0;

  return {
    status,
    hasText,
    missingTestaments,
    availableTestaments,
  };
};

/**
 * Get availability status for multiple stories (e.g., in a category)
 * @param {Array} storyIds - Array of story IDs
 * @param {Object} storyMetadataCache - Cache of story metadata
 * @param {Object} languageData - Language data
 * @returns {Object} Aggregated statistics
 */
export const getCategoryAvailability = (
  storyIds,
  storyMetadataCache,
  languageData,
) => {
  const stats = {
    total: storyIds.length,
    full: 0,
    empty: 0,
    unknown: 0,
  };

  storyIds.forEach((storyId) => {
    const metadata = storyMetadataCache[storyId];
    const availability = getStoryAvailability(metadata, languageData);

    switch (availability.status) {
      case "full":
        stats.full++;
        break;
      case "empty":
        stats.empty++;
        break;
      default:
        stats.unknown++;
    }
  });

  return stats;
};

/**
 * Get icon for story availability status
 * @param {string} status - Status from getStoryAvailability
 * @returns {string} Icon character
 */
export const getAvailabilityIcon = (status) => {
  const iconMap = {
    full: "✓",
    partial: "◐",
    empty: "∅",
    missing: "∅",
    unknown: "?",
  };

  return iconMap[status] || "?";
};

/**
 * Check if a story needs audio fallback (primary language doesn't have timecode audio)
 * @param {Object} storyMetadata - Cached story metadata with testaments info
 * @param {Object} languageDataMap - Map of language codes to language data
 * @param {Array} selectedLanguages - Array of selected language codes (fallback is last)
 * @returns {boolean} True if audio fallback is needed
 */
export const needsAudioFallback = (
  storyMetadata,
  languageDataMap,
  selectedLanguages,
) => {
  // If no selected languages or only one language, no fallback concept
  if (!selectedLanguages || selectedLanguages.length <= 1) {
    return false;
  }

  // If no metadata, can't determine
  if (!storyMetadata?.testaments) {
    return false;
  }

  const testaments = storyMetadata.testaments;

  // Check which testaments are needed
  const testamentsNeeded = [];
  if (testaments.usesOT) testamentsNeeded.push("ot");
  if (testaments.usesNT) testamentsNeeded.push("nt");

  if (testamentsNeeded.length === 0) {
    return false;
  }

  // Check if primary language (first in array) has timecode audio for all needed testaments
  const primaryLang = selectedLanguages[0];
  const primaryLangData = languageDataMap[primaryLang];

  if (!primaryLangData) {
    return true; // No data for primary = needs fallback
  }

  for (const testament of testamentsNeeded) {
    const testamentData = primaryLangData[testament];

    if (!testamentData || !testamentData.audioFilesetId) {
      return true; // Missing audio fileset = needs fallback
    }

    const hasTimecode = ["with-timecode", "audio-with-timecode"].includes(
      testamentData.audioCategory,
    );

    if (!hasTimecode) {
      return true; // No timecode = needs fallback
    }
  }

  return false; // Primary language has all needed audio with timecode
};
