import React, { useState } from "react";
import "./StorySection.css";
import BSBText from "../BSBText";
import LexiconModal from "../LexiconModal";

// Mode labels for display
const MODE_LABELS = {
  eng: "ENG",
  strongs: "Strong's",
  "interlinear-compact": "Compact",
  "interlinear-full": "Full",
};

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
  // Global BSB display mode props
  bsbDisplayMode = "eng",
  useHebrewOrder = false,
  isOldTestament = false,
  engIsExplicit = false,
  onModeIndicatorClick,
}) {
  // State for lexicon modal
  const [lexiconModal, setLexiconModal] = useState({
    isOpen: false,
    strongs: null,
  });

  // Get the section data for the primary language (for image and reference)
  const primarySection = sectionsMap[primaryLanguage]?.[sectionIndex];

  if (!primarySection) {
    return null;
  }

  // Check if any language has visible text for this section
  const hasVisibleText = selectedLanguages.some((langCode) => {
    const langSection = sectionsMap[langCode]?.[sectionIndex];
    return langSection?.text?.trim();
  });

  const handleClick = () => {
    if (!isLoading && onSectionClick) {
      onSectionClick(sectionIndex);
    }
  };

  const handleWordClick = (strongsNumber) => {
    setLexiconModal({ isOpen: true, strongs: strongsNumber });
  };

  const closeLexiconModal = () => {
    setLexiconModal({ isOpen: false, strongs: null });
  };

  const handleModeIndicatorClick = (e) => {
    e.stopPropagation();
    if (onModeIndicatorClick) {
      onModeIndicatorClick();
    }
  };

  return (
    <>
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
        <div
          className={`story-section-languages${!hasVisibleText ? " story-section-no-text" : ""}`}
        >
          {selectedLanguages.map((langCode, langIndex) => {
            const isPrimary = langIndex === 0;
            // Only treat as fallback if English was NOT explicitly selected
            const isFallback =
              langIndex === selectedLanguages.length - 1 &&
              langIndex > 0 &&
              !engIsExplicit;
            const langSection = sectionsMap[langCode]?.[sectionIndex];

            // Skip if no content for this language
            if (!langSection?.text?.trim()) {
              return null;
            }

            // Hide fallback language if any non-fallback language has text for this section
            // But track if we're showing fallback because primary is missing
            // Skip this logic entirely if English was explicitly selected
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

            const hasBSBData = langCode === "eng" && langSection.bsbData;

            // Check if this language should use RTL (hardcoded for now, will be in language data later)
            const isRTL =
              langCode === "heb" || langCode === "arb" || langCode === "ara";

            return (
              <div key={langCode} className="story-language-section">
                {/* Warning line when showing fallback text due to missing primary */}
                {showingFallbackWarning && (
                  <div className="story-section-missing-warning">⚠ [...] ∅</div>
                )}

                {/* Language code - shown to the right, only for non-primary without BSB */}
                {!isPrimary && !hasBSBData && (
                  <span className="story-language-code">
                    {langCode.toUpperCase()}
                  </span>
                )}

                {/* Mode indicator for English with BSB data - clickable to open dialog */}
                {hasBSBData && (
                  <button
                    className={`bsb-mode-indicator ${bsbDisplayMode !== "eng" ? "bsb-mode-indicator-active" : ""}`}
                    onClick={handleModeIndicatorClick}
                    title="Click to change display mode"
                  >
                    {MODE_LABELS[bsbDisplayMode] || "ENG"}
                  </button>
                )}

                {/* Text content - use BSBText for English with BSB data */}
                <div
                  className={`story-section-text ${isRTL ? "story-section-text-rtl" : ""}`}
                >
                  {hasBSBData ? (
                    <BSBText
                      bsbData={langSection.bsbData}
                      displayMode={bsbDisplayMode}
                      useHebrewOrder={useHebrewOrder}
                      onWordClick={handleWordClick}
                      onCrossRefClick={(bookCode, chapter, verse) => {
                        // For now, log the cross-reference click
                        // Future: could navigate to that passage
                        console.log(
                          `Cross-ref clicked: ${bookCode} ${chapter}:${verse}`,
                        );
                      }}
                    />
                  ) : (
                    langSection.text.split("\n").map((line, lineIndex) => {
                      const trimmedLine = line.trim();
                      if (!trimmedLine) return null;
                      return (
                        <p key={lineIndex} className="story-paragraph">
                          {trimmedLine}
                        </p>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lexicon Modal - rendered outside story-section to avoid click conflicts */}
      <LexiconModal
        strongsNumber={lexiconModal.strongs}
        isOpen={lexiconModal.isOpen}
        onClose={closeLexiconModal}
      />
    </>
  );
}

export default StorySection;
