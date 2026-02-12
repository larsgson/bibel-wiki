/**
 * Missing stories detection utilities
 * Compares what stories SHOULD exist (from index.toml) vs what DOES exist (from manifest.json)
 */

// Cache for missing stories per template to avoid repeated calculations
let missingStoriesCache = {};
let cacheTimestamps = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Parse TOML text into an object (simplified parser for our use case)
 */
const parseToml = (text) => {
  const lines = text.split("\n");
  const result = { stories: [] };
  let currentStory = null;
  let inImage = false;
  let inArray = false;
  let arrayKey = null;
  let arrayValues = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    if (line.startsWith("#") || line === "") continue;

    if (line.startsWith("[") && line.endsWith("]")) {
      if (line === "[image]") {
        inImage = true;
        result.image = {};
        continue;
      }

      if (line === "[[stories]]") {
        if (currentStory) {
          result.stories.push(currentStory);
        }
        currentStory = {};
        inImage = false;
        continue;
      }

      inImage = false;
      continue;
    }

    if (line.match(/^(\w+)\s*=\s*\[$/)) {
      const match = line.match(/^(\w+)\s*=\s*\[$/);
      arrayKey = match[1];
      inArray = true;
      arrayValues = [];
      continue;
    }

    if (inArray && line === "]") {
      result[arrayKey] = arrayValues;
      inArray = false;
      arrayKey = null;
      arrayValues = [];
      continue;
    }

    if (inArray) {
      let cleanValue = line.replace(/,$/g, "");
      cleanValue = cleanValue.replace(/^"/, "").replace(/"$/, "");
      if (cleanValue) {
        arrayValues.push(cleanValue);
      }
      continue;
    }

    const match = line.match(/^(\w+)\s*=\s*(.+)$/);
    if (match) {
      const key = match[1];
      let value = match[2].trim();

      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("[") && value.endsWith("]")) {
        value = value
          .slice(1, -1)
          .split(",")
          .map((v) => v.trim().replace(/"/g, ""));
      } else if (!isNaN(value)) {
        value = parseInt(value);
      }

      if (inImage) {
        result.image[key] = value;
      } else if (currentStory) {
        currentStory[key] = value;
      } else {
        result[key] = value;
      }
    }
  }

  if (currentStory) {
    result.stories.push(currentStory);
  }

  return result;
};

/**
 * Load and check missing stories for a story set
 * @param {string} storySetId - The story set ID (e.g., "OBS")
 * @returns {Promise<Object>} Object with missing stories by category and flat list
 */
export const checkMissingStories = async (storySetId = "OBS") => {
  // Check cache for this specific template
  if (
    missingStoriesCache[storySetId] &&
    cacheTimestamps[storySetId] &&
    Date.now() - cacheTimestamps[storySetId] < CACHE_DURATION
  ) {
    return missingStoriesCache[storySetId];
  }

  try {
    // Load manifest.json to see what files actually exist
    const manifestResponse = await fetch(
      `/templates/${storySetId}/manifest.json`,
    );
    const manifest = await manifestResponse.json();

    // Build set of existing story files from manifest
    const existingFiles = new Set(
      manifest.files
        .map((f) => f.path)
        .filter((p) => p.endsWith(".md"))
        .map((p) => p.toLowerCase()),
    );

    // Load root index.toml to get categories
    const rootIndexResponse = await fetch(
      `/templates/${storySetId}/index.toml`,
    );
    const rootIndexText = await rootIndexResponse.text();
    const rootIndex = parseToml(rootIndexText);

    const missingByCategory = {};
    const missingStoryIds = new Set();
    const allExpectedStories = {};

    // For each category, load its index.toml and compare
    const categories = (rootIndex.categories || []).map((cat) =>
      typeof cat === "string" ? cat : cat.id,
    );
    for (const categoryDir of categories) {
      try {
        const categoryResponse = await fetch(
          `/templates/${storySetId}/${categoryDir}/index.toml`,
        );
        const categoryText = await categoryResponse.text();
        const categoryData = parseToml(categoryText);

        const categoryMissing = [];

        const stories = (categoryData.stories || []).map((s) =>
          typeof s === "string" ? { id: s } : s,
        );
        for (const story of stories) {
          const storyFilePath = `${categoryDir}/${story.id}.md`.toLowerCase();

          // Store all expected stories
          allExpectedStories[story.id] = {
            id: story.id,
            category: categoryDir,
            image: story.image,
          };

          // Check if this story file exists in manifest
          if (!existingFiles.has(storyFilePath)) {
            categoryMissing.push({
              id: story.id,
              expectedPath: storyFilePath,
            });
            missingStoryIds.add(story.id);
          }
        }

        if (categoryMissing.length > 0) {
          missingByCategory[categoryDir] = {
            categoryId: categoryData.id || categoryDir,
            missing: categoryMissing,
            totalExpected: categoryData.stories?.length || 0,
            totalMissing: categoryMissing.length,
          };
        }
      } catch (err) {
        console.warn(`Could not load category ${categoryDir}:`, err);
      }
    }

    const result = {
      storySetId,
      missingByCategory,
      missingStoryIds: Array.from(missingStoryIds),
      missingStoryIdsSet: missingStoryIds,
      totalMissing: missingStoryIds.size,
      allExpectedStories,
      checkedAt: Date.now(),
    };

    // Update cache for this template
    missingStoriesCache[storySetId] = result;
    cacheTimestamps[storySetId] = Date.now();

    return result;
  } catch (error) {
    console.error("Error checking missing stories:", error);
    return {
      storySetId,
      missingByCategory: {},
      missingStoryIds: [],
      missingStoryIdsSet: new Set(),
      totalMissing: 0,
      allExpectedStories: {},
      error: error.message,
    };
  }
};

/**
 * Check if a specific story is missing
 * @param {string} storyId - The story ID to check
 * @returns {boolean} True if the story is missing
 */
export const isStoryMissing = (storyId, missingStoriesData) => {
  if (!missingStoriesData || !missingStoriesData.missingStoryIdsSet) {
    return false;
  }
  return missingStoriesData.missingStoryIdsSet.has(storyId);
};

/**
 * Clear the missing stories cache (useful when content is updated)
 */
export const clearMissingStoriesCache = () => {
  missingStoriesCache = {};
  cacheTimestamps = {};
};

/**
 * Get cached missing stories data without fetching
 * @param {string} storySetId - The story set ID
 * @returns {Object|null} Cached data or null if not available
 */
export const getCachedMissingStories = (storySetId = "OBS") => {
  if (
    missingStoriesCache[storySetId] &&
    cacheTimestamps[storySetId] &&
    Date.now() - cacheTimestamps[storySetId] < CACHE_DURATION
  ) {
    return missingStoriesCache[storySetId];
  }
  return null;
};
