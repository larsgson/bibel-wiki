import { useState, useEffect, useRef } from "react";
import "./NavigationGrid.css";
import useTranslation from "../hooks/useTranslation";
import useLanguage from "../hooks/useLanguage";
import AvailabilityBadge from "./AvailabilityBadge";
import AudioFallbackBadge from "./AudioFallbackBadge";
import {
  getStoryAvailabilityMultiLang,
  needsAudioFallback,
} from "../utils/storyAvailability";
import { checkMissingStories, isStoryMissing } from "../utils/missingStories";

// Parse locale TOML files (flat sections like [01], [01.01], etc.)
const parseLocaleToml = (text) => {
  const lines = text.split("\n");
  const result = {};
  let currentSection = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || trimmed === "") continue;

    const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      if (!result[currentSection]) result[currentSection] = {};
      continue;
    }

    const kvMatch = trimmed.match(/^(\w+)\s*=\s*"((?:[^"\\]|\\.)*)"/);
    if (kvMatch && currentSection) {
      result[currentSection][kvMatch[1]] = kvMatch[2].replace(/\\"/g, '"');
    } else if (kvMatch && !currentSection) {
      // Top-level keys (e.g., title = "Open Bible Stories")
      result[kvMatch[1]] = kvMatch[2].replace(/\\"/g, '"');
    }
  }

  return result;
};

const parseToml = (text) => {
  const lines = text.split("\n");
  const result = { stories: [], categories: [] };
  let currentStory = null;
  let currentCategory = null;
  let inImage = false;
  let inArray = false;
  let arrayKey = null;
  let arrayValues = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    if (line.startsWith("#") || line === "") continue;

    // Check for section headers
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
        currentCategory = null;
        inImage = false;
        continue;
      }

      if (line === "[[categories]]") {
        if (currentCategory) {
          result.categories.push(currentCategory);
        }
        currentCategory = {};
        currentStory = null;
        inImage = false;
        continue;
      }

      // Reset section flags for other sections
      inImage = false;
      continue;
    }

    // Check if this is the start of a multi-line array
    if (line.match(/^(\w+)\s*=\s*\[$/)) {
      const match = line.match(/^(\w+)\s*=\s*\[$/);
      arrayKey = match[1];
      inArray = true;
      arrayValues = [];
      continue;
    }

    // Check if this is the end of a multi-line array
    if (inArray && line === "]") {
      result[arrayKey] = arrayValues;
      inArray = false;
      arrayKey = null;
      arrayValues = [];
      continue;
    }

    // Check if we're inside a multi-line array
    if (inArray) {
      let cleanValue = line.replace(/,$/g, ""); // Remove trailing comma
      cleanValue = cleanValue.replace(/^"/, "").replace(/"$/, ""); // Remove quotes
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
      } else if (currentCategory) {
        currentCategory[key] = value;
      } else {
        result[key] = value;
      }
    }
  }

  if (currentStory) {
    result.stories.push(currentStory);
  }
  if (currentCategory) {
    result.categories.push(currentCategory);
  }

  return result;
};

// Load a single locale file, returns parsed data or null
const fetchLocale = async (storySetId, lang) => {
  try {
    const response = await fetch(
      `/templates/${storySetId}/locales/${lang}.toml`,
    );
    if (response.ok) {
      return parseLocaleToml(await response.text());
    }
  } catch {
    // Not available
  }
  return null;
};

// Deep-merge two locale objects: base values filled in where overlay is missing
const mergeLocales = (base, overlay) => {
  if (!base) return overlay || {};
  if (!overlay) return base;
  const result = { ...base };
  for (const key of Object.keys(overlay)) {
    if (typeof overlay[key] === "object" && typeof base[key] === "object") {
      result[key] = { ...base[key], ...overlay[key] };
    } else {
      result[key] = overlay[key];
    }
  }
  return result;
};

// Load locale data for a template (English base, selected language overlaid)
const loadLocaleData = async (storySetId, selectedLanguage) => {
  const engLocale = await fetchLocale(storySetId, "eng");
  if (!selectedLanguage || selectedLanguage === "eng") {
    return engLocale || {};
  }
  const langLocale = await fetchLocale(storySetId, selectedLanguage);
  return mergeLocales(engLocale, langLocale);
};

function NavigationGrid({
  storySetId,
  layoutTheme,
  onStorySelect,
  onBack,
  showEmptyContent,
  onToggleEmptyContent,
}) {
  const { t } = useTranslation();
  const {
    getStoryMetadata,
    languageData,
    selectedLanguage,
    selectedLanguages,
    storyMetadata,
    preloadBibleReferences,
  } = useLanguage();
  const [navigationPath, setNavigationPath] = useState([]);
  const [currentItems, setCurrentItems] = useState([]);
  const [currentLevel, setCurrentLevel] = useState("collection");
  const [loading, setLoading] = useState(true);
  const [missingStoriesData, setMissingStoriesData] = useState(null);
  const [localeTitle, setLocaleTitle] = useState(null);
  const loadCounterRef = useRef(0);

  // Load missing stories data when template changes
  useEffect(() => {
    const loadMissingStories = async () => {
      const data = await checkMissingStories(storySetId);
      setMissingStoriesData(data);
    };
    loadMissingStories();
  }, [storySetId]);

  // Preload story metadata for availability badges
  useEffect(() => {
    preloadBibleReferences(storySetId);
  }, [preloadBibleReferences, storySetId]);

  useEffect(() => {
    const loadId = ++loadCounterRef.current;

    const loadCurrentLevel = async () => {
      setLoading(true);

      // Load locale data inline — no closure issues
      const locale = await loadLocaleData(storySetId, selectedLanguage);

      // Abort if a newer load was triggered while we waited
      if (loadId !== loadCounterRef.current) return;

      setLocaleTitle(locale?.title);

      try {
        if (navigationPath.length === 0) {
          const response = await fetch(`/templates/${storySetId}/index.toml`);
          const text = await response.text();
          const data = parseToml(text);

          if (loadId !== loadCounterRef.current) return;

          const categoriesData = await Promise.all(
            data.categories.map(async (cat) => {
              // Support both object format ({id, image}) and plain string
              const categoryDir = typeof cat === "string" ? cat : cat.id;
              const topLevelImage =
                typeof cat === "string" ? null : cat.image || null;

              const url = `/templates/${storySetId}/${categoryDir}/index.toml`;
              const catResponse = await fetch(url);
              const catText = await catResponse.text();
              const catData = parseToml(catText);

              // Resolve title from locale data
              const catId = catData.id || categoryDir;
              const catTitle = locale?.[catId]?.title;

              // Check if all stories in this category are missing content
              const storyIds = catData.stories
                ? catData.stories.map((s) => (typeof s === "string" ? s : s.id))
                : [];

              // Count missing stories (files that don't exist in templates)
              const missingCount = storyIds.filter((id) =>
                isStoryMissing(id, missingStoriesData),
              ).length;

              // Check availability for stories that exist using multi-language logic
              const existingStoryIds = storyIds.filter(
                (id) => !isStoryMissing(id, missingStoriesData),
              );

              // Count story availability statuses
              let emptyCount = 0;
              let partialCount = 0;
              let fullCount = 0;
              existingStoryIds.forEach((storyId) => {
                const metadata = getStoryMetadata(storyId);
                const availability = getStoryAvailabilityMultiLang(
                  metadata,
                  languageData,
                  selectedLanguages,
                );
                if (availability.status === "empty") {
                  emptyCount++;
                } else if (availability.status === "partial") {
                  partialCount++;
                } else if (availability.status === "full") {
                  fullCount++;
                }
              });

              let categoryStatus = null;
              const totalStories = storyIds.length;

              if (totalStories > 0 && missingCount === totalStories) {
                categoryStatus = "missing";
              } else if (
                existingStoryIds.length > 0 &&
                emptyCount === existingStoryIds.length
              ) {
                categoryStatus = "empty";
              } else if (partialCount > 0) {
                categoryStatus = "partial";
              }

              // Prefer top-level image, fall back to sub-file image
              const categoryImage =
                topLevelImage ||
                catData.image?.filename ||
                catData.stories?.[0]?.image ||
                null;

              return {
                id: catId,
                title: catTitle,
                image: categoryImage,
                path: categoryDir,
                level: "category",
                availability: categoryStatus
                  ? { status: categoryStatus }
                  : null,
                missingCount,
              };
            }),
          );

          if (loadId !== loadCounterRef.current) return;
          setCurrentItems(categoriesData);
          setCurrentLevel("collection");
        } else if (navigationPath.length === 1) {
          const categoryPath = navigationPath[0].path;
          const categoryId = navigationPath[0].id;
          const response = await fetch(
            `/templates/${storySetId}/${categoryPath}/index.toml`,
          );
          const text = await response.text();
          const data = parseToml(text);

          // Normalize stories: support both [[stories]] objects and simple string arrays
          let stories = data.stories.map((s) =>
            typeof s === "string" ? { id: s } : s,
          );
          if (stories.length === 0 && missingStoriesData?.allExpectedStories) {
            try {
              const manifestResponse = await fetch(
                `/templates/${storySetId}/manifest.json`,
              );
              if (manifestResponse.ok) {
                const manifest = await manifestResponse.json();
                const mdFiles = manifest.files
                  .map((f) => f.path)
                  .filter(
                    (p) =>
                      p.startsWith(`${categoryPath}/`) && p.endsWith(".md"),
                  )
                  .map((p) =>
                    p.replace(`${categoryPath}/`, "").replace(".md", ""),
                  );
                stories = mdFiles.map((id) => ({ id }));
              }
            } catch {
              // Keep empty stories array
            }
          }

          if (loadId !== loadCounterRef.current) return;

          const storiesData = stories.map((story) => {
            const storyId = story.id;

            // Resolve title from locale data (e.g., locale["01.01"].title)
            const storyTitle = locale?.[`${categoryId}.${storyId}`]?.title;

            // First check if story file is missing from templates
            const isMissing = isStoryMissing(storyId, missingStoriesData);

            if (isMissing) {
              return {
                id: story.id,
                title: storyTitle,
                image: story.image || data.image?.filename,
                path: `${categoryPath}/${story.id}.md`,
                level: "story",
                storyImage: story.image,
                availability: { status: "missing" },
              };
            }

            // Story exists - check language availability across all non-fallback languages
            const metadata = getStoryMetadata(storyId);
            const availability = getStoryAvailabilityMultiLang(
              metadata,
              languageData,
              selectedLanguages,
            );
            const audioFallback = needsAudioFallback(
              metadata,
              languageData,
              selectedLanguages,
            );

            return {
              id: story.id,
              title: storyTitle,
              image: story.image || data.image?.filename,
              path: `${categoryPath}/${story.id}.md`,
              level: "story",
              storyImage: story.image,
              availability: availability,
              audioFallback: audioFallback,
            };
          });

          setCurrentItems(storiesData);
          setCurrentLevel("category");
        }
      } catch (error) {
        console.error("Error loading navigation:", error);
      }
      if (loadId === loadCounterRef.current) {
        setLoading(false);
      }
    };

    loadCurrentLevel();
  }, [
    navigationPath,
    storySetId,
    storyMetadata,
    selectedLanguage,
    selectedLanguages,
    languageData,
    missingStoriesData,
  ]);

  const handleItemClick = (item) => {
    if (item.level === "category") {
      setNavigationPath([...navigationPath, item]);
    } else if (item.level === "story") {
      onStorySelect({
        id: item.id,
        path: item.path,
        image: item.storyImage,
        title: item.title,
        storySetId,
        layoutTheme,
      });
    }
  };

  const handleBackClick = () => {
    if (navigationPath.length > 0) {
      setNavigationPath(navigationPath.slice(0, -1));
    }
  };

  const getCurrentTitle = () => {
    if (navigationPath.length === 0) {
      return localeTitle;
    } else {
      return navigationPath[navigationPath.length - 1].title;
    }
  };

  if (loading) {
    return (
      <div className="navigation-loading">{t("navigationGrid.loading")}</div>
    );
  }

  // Filter items based on showEmptyContent state
  const visibleItems = showEmptyContent
    ? currentItems
    : currentItems.filter(
        (item) =>
          !item.availability ||
          (item.availability.status !== "empty" &&
            item.availability.status !== "missing"),
      );

  // Count total empty/missing items (for showing button)
  const emptyItemCount = currentItems.filter(
    (item) =>
      item.availability &&
      (item.availability.status === "empty" ||
        item.availability.status === "missing"),
  ).length;

  // Count currently hidden items (for display)
  const hiddenCount = currentItems.length - visibleItems.length;

  return (
    <div className="navigation-container">
      <div className="navigation-header">
        {navigationPath.length === 0 && onBack && (
          <button className="back-button" onClick={onBack}>
            ←
          </button>
        )}
        {navigationPath.length > 0 && (
          <button className="back-button" onClick={handleBackClick}>
            ← Back
          </button>
        )}
        <h1 className="navigation-title">{getCurrentTitle()}</h1>
        {emptyItemCount > 0 && (
          <button
            className="empty-content-toggle"
            onClick={onToggleEmptyContent}
            title={
              showEmptyContent
                ? `Hide ${emptyItemCount} stories without text`
                : `Show ${emptyItemCount} stories without text`
            }
          >
            {showEmptyContent ? `▦${emptyItemCount}` : `👁‍🗨${emptyItemCount}`}
          </button>
        )}
      </div>

      <div className={`navigation-grid ${currentLevel}`}>
        {visibleItems.map((item) => {
          const isCategory = item.level === "category";
          return (
            <div
              key={item.path}
              className={`navigation-item ${item.level}`}
              onClick={() => handleItemClick(item)}
            >
              <div
                className={
                  isCategory ? "category-icon-wrapper" : "story-icon-wrapper"
                }
                style={{ position: "relative" }}
              >
                <div
                  className={
                    isCategory ? "category-icon-clipped" : "story-icon-clipped"
                  }
                >
                  {item.image && (
                    <img
                      src={
                        item.image.startsWith("http") ||
                        item.image.startsWith("/")
                          ? item.image
                          : `/navIcons/${item.image}`
                      }
                      alt={item.title}
                      className="navigation-image"
                    />
                  )}
                  <div className="navigation-item-title">{item.title}</div>
                </div>
                {item.audioFallback && <AudioFallbackBadge size="small" />}
                {item.availability && (
                  <AvailabilityBadge
                    status={item.availability.status}
                    size="small"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default NavigationGrid;
