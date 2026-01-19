import { useState, useEffect } from "react";
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

function NavigationGrid({
  onStorySelect,
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

  // Load missing stories data on mount
  useEffect(() => {
    const loadMissingStories = async () => {
      const data = await checkMissingStories("OBS");
      setMissingStoriesData(data);
    };
    loadMissingStories();
  }, []);

  // Preload story metadata for availability badges
  useEffect(() => {
    preloadBibleReferences();
  }, [preloadBibleReferences]);

  useEffect(() => {
    loadCurrentLevel();
  }, [
    navigationPath,
    storyMetadata,
    selectedLanguage,
    selectedLanguages,
    languageData,
    missingStoriesData,
  ]);

  const loadCurrentLevel = async () => {
    setLoading(true);
    try {
      if (navigationPath.length === 0) {
        const response = await fetch("/templates/OBS/index.toml");
        const text = await response.text();
        const data = parseToml(text);

        const categoriesData = await Promise.all(
          data.categories.map(async (categoryDir) => {
            const url = `/templates/OBS/${categoryDir}/index.toml`;
            const catResponse = await fetch(url);
            const catText = await catResponse.text();
            const catData = parseToml(catText);

            // Check if all stories in this category are missing content
            const storyIds = catData.stories
              ? catData.stories.map((s) => s.id)
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

            // Determine category status:
            // - "missing" only if ALL stories are missing from templates
            // - "empty" only if ALL existing stories lack content in non-fallback languages
            // - "partial" if at least one story has partial availability
            // - null otherwise (all stories are fully available)
            let categoryStatus = null;
            const totalStories = storyIds.length;

            if (totalStories > 0 && missingCount === totalStories) {
              // ALL stories are missing
              categoryStatus = "missing";
            } else if (
              existingStoryIds.length > 0 &&
              emptyCount === existingStoryIds.length
            ) {
              // All existing stories lack content in non-fallback languages
              categoryStatus = "empty";
            } else if (partialCount > 0) {
              // At least one story has partial availability
              categoryStatus = "partial";
            }

            return {
              id: catData.id,
              title: catData.title,
              image: catData.image?.filename,
              path: categoryDir,
              level: "category",
              availability: categoryStatus ? { status: categoryStatus } : null,
              missingCount,
            };
          }),
        );

        setCurrentItems(categoriesData);
        setCurrentLevel("collection");
      } else if (navigationPath.length === 1) {
        const categoryPath = navigationPath[0].path;
        const response = await fetch(
          `/templates/OBS/${categoryPath}/index.toml`,
        );
        const text = await response.text();
        const data = parseToml(text);

        const storiesData = data.stories.map((story) => {
          const storyId = story.id;

          // First check if story file is missing from templates
          const isMissing = isStoryMissing(storyId, missingStoriesData);

          if (isMissing) {
            // Story file doesn't exist - show "missing" badge
            return {
              id: story.id,
              title: story.title,
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
            title: story.title,
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
    setLoading(false);
  };

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

  const handleItemClick = (item) => {
    if (item.level === "category") {
      setNavigationPath([...navigationPath, item]);
    } else if (item.level === "story") {
      onStorySelect({
        id: item.id,
        path: item.path,
        image: item.storyImage,
        title: item.title,
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
      return "Open Bible Stories";
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
  // Include both "empty" and "missing" in the filter
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
              {item.image && (
                <div
                  className={
                    isCategory ? "category-icon-wrapper" : "story-icon-wrapper"
                  }
                  style={{ position: "relative" }}
                >
                  <div
                    className={
                      isCategory
                        ? "category-icon-clipped"
                        : "story-icon-clipped"
                    }
                  >
                    <img
                      src={
                        item.image.startsWith("http")
                          ? item.image
                          : `/navIcons/${item.image}`
                      }
                      alt={item.title}
                      className="navigation-image"
                    />
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default NavigationGrid;
