import React from "react";
import "./StorySection.css";

/**
 * StorySection component - displays a single story section with multi-language support
 * Shows image once, then text in multiple languages below
 * Clicking the card plays/jumps to that section's audio
 */
function StorySection({
  section,
  sectionIndex,
  selectedLanguages,
  primaryLanguage,
  sectionsMap,
  isPlaying,
  onSectionClick,
  isLoading = false,
  audioFallback = false,
}) {
  // Get the section data for the primary language (for image and reference)
  const primarySection = sectionsMap[primaryLanguage]?.[sectionIndex];

  if (!primarySection) {
    return null;
  }

  const handleClick = () => {
    if (!isLoading && onSectionClick) {
      onSectionClick(sectionIndex);
    }
  };

  return (
    <div
      className={`story-section ${isPlaying ? "story-section-playing" : ""} ${!isLoading ? "story-section-clickable" : ""}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Image and Reference - shown once at the top */}
      <div className="story-section-image-wrapper">
        {primarySection.imageUrl && (
          <img
            src={primarySection.imageUrl}
            alt={`Section ${sectionIndex + 1}`}
            className="story-image"
          />
        )}
        {audioFallback && (
          <div className="story-section-audio-fallback-icon">
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="#bbb"
              style={{ display: "block" }}
            >
              <path d="M8 5v14l11-7z" />
            </svg>
            <div className="story-section-audio-fallback-slash" />
          </div>
        )}
        {primarySection.reference && (
          <div className="story-section-ref-overlay">
            {primarySection.reference}
          </div>
        )}
      </div>

      {/* Multi-language text sections */}
      <div className="story-section-languages">
        {selectedLanguages.map((langCode, langIndex) => {
          const isPrimary = langIndex === 0;
          const isSecondary = langIndex === 1 && selectedLanguages.length > 2;
          const isFallback =
            langIndex === selectedLanguages.length - 1 && langIndex > 0;
          const langSection = sectionsMap[langCode]?.[sectionIndex];

          // Skip if no content for this language
          if (!langSection?.text?.trim()) {
            return null;
          }

          // Hide fallback language if any non-fallback language has text for this section
          // But track if we're showing fallback because primary is missing
          let showingFallbackWarning = false;
          if (isFallback) {
            const otherLanguagesHaveText = selectedLanguages
              .slice(0, -1)
              .some((otherLang) => {
                const otherSection = sectionsMap[otherLang]?.[sectionIndex];
                return otherSection?.text?.trim();
              });
            if (otherLanguagesHaveText) {
              return null;
            }
            // If we get here, fallback is being shown because others are missing
            showingFallbackWarning = true;
          }

          return (
            <div key={langCode} className="story-language-section">
              {/* Warning line when showing fallback text due to missing primary */}
              {showingFallbackWarning && (
                <div className="story-section-missing-warning">⚠ [...] ∅</div>
              )}

              {/* Language code - shown to the right, only for non-primary */}
              {!isPrimary && (
                <span className="story-language-code">
                  {langCode.toUpperCase()}
                </span>
              )}

              {/* Text content */}
              <div className="story-section-text">
                {langSection.text.split("\n").map((line, lineIndex) => {
                  const trimmedLine = line.trim();
                  if (!trimmedLine) return null;
                  return (
                    <p key={lineIndex} className="story-paragraph">
                      {trimmedLine}
                    </p>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default StorySection;
