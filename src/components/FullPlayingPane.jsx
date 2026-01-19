import React, { useState, useMemo } from "react";
import useMediaPlayer from "../hooks/useMediaPlayer";
import useTranslation from "../hooks/useTranslation";
import "./FullPlayingPane.css";

const FullPlayingPane = ({
  sectionsMap = {},
  selectedLanguages = [],
  primaryLanguage = null,
}) => {
  const { t } = useTranslation();
  const { currentPlaylist, isPlaying, currentSegmentIndex, getCurrentSegment } =
    useMediaPlayer();

  const [showText, setShowText] = useState(false);

  const currentSegment = getCurrentSegment();

  // Get current section index (0-based) from the segment
  const currentSectionIndex = useMemo(() => {
    if (!currentSegment) return -1;
    return (currentSegment.sectionNum || 1) - 1;
  }, [currentSegment]);

  // Get current section data from parsed sections
  const currentSectionData = useMemo(() => {
    if (!currentSegment || !currentSegment.imageUrl) {
      return null;
    }

    return {
      imageUrl: currentSegment.imageUrl,
      reference: currentSegment.reference || "",
      sectionNum: currentSegment.sectionNum || currentSegmentIndex + 1,
    };
  }, [currentSegment, currentSegmentIndex]);

  // Calculate animation duration based on segment timing
  const animationDuration = useMemo(() => {
    if (!currentSegment || !currentSegment.duration) {
      return 10; // Default 10 seconds
    }
    return currentSegment.duration;
  }, [currentSegment]);

  // Cycle through different Ken Burns animations
  const animationVariant = useMemo(() => {
    return (currentSegmentIndex % 4) + 1;
  }, [currentSegmentIndex]);

  if (!currentSectionData || !currentPlaylist || currentPlaylist.length === 0) {
    return null;
  }

  const toggleText = () => {
    setShowText(!showText);
  };

  return (
    <div className={`full-playing-pane ${showText ? "text-visible" : ""}`}>
      <div className="full-playing-pane-image-container">
        <img
          key={currentSegmentIndex}
          src={currentSectionData.imageUrl}
          alt={`${t("fullPlayingPane.sectionAlt")} ${currentSectionData.sectionNum}`}
          className={`full-playing-pane-image ${
            isPlaying ? `ken-burns-${animationVariant}` : ""
          }`}
          style={{
            animationDuration: isPlaying ? `${animationDuration}s` : "0s",
          }}
        />
      </div>

      <button
        className="full-playing-pane-toggle-btn"
        onClick={toggleText}
        aria-label={
          showText
            ? t("fullPlayingPane.hideText")
            : t("fullPlayingPane.showText")
        }
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            display: "block",
            transition: "transform 0.3s ease",
            transform: showText ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          <path d="M7 10l5 5 5-5z" fill="#eee" />
        </svg>
      </button>

      <div
        className={`full-playing-pane-text ${showText ? "visible" : "hidden"}`}
      >
        <div className="full-playing-pane-text-content">
          {selectedLanguages.map((langCode, langIndex) => {
            const isPrimary = langIndex === 0;
            const isSecondary = langIndex === 1 && selectedLanguages.length > 2;
            const isFallback =
              langIndex === selectedLanguages.length - 1 && langIndex > 0;
            const langSection = sectionsMap[langCode]?.[currentSectionIndex];

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
                  const otherSection =
                    sectionsMap[otherLang]?.[currentSectionIndex];
                  return otherSection?.text?.trim();
                });
              if (otherLanguagesHaveText) {
                return null;
              }
              // If we get here, fallback is being shown because others are missing
              showingFallbackWarning = true;
            }

            return (
              <div
                key={langCode}
                className="full-playing-pane-language-section"
              >
                {/* Warning line when showing fallback text due to missing primary */}
                {showingFallbackWarning && (
                  <div className="full-playing-pane-missing-warning">
                    ⚠ [...] ∅
                  </div>
                )}

                {/* Language code - shown only for non-primary */}
                {!isPrimary && (
                  <span className="full-playing-pane-language-code">
                    {langCode.toUpperCase()}
                  </span>
                )}

                {/* Text content */}
                <div className="full-playing-pane-section-text">
                  {langSection.text.split("\n").map((line, lineIndex) => {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) return null;
                    return (
                      <p
                        key={lineIndex}
                        className="full-playing-pane-paragraph"
                      >
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
    </div>
  );
};

export default FullPlayingPane;
