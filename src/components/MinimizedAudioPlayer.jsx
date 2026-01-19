import React, { useMemo } from "react";
import useMediaPlayer from "../hooks/useMediaPlayer";
import useTranslation from "../hooks/useTranslation";
import useLanguage from "../hooks/useLanguage";
import LanguageSwitcher from "./LanguageSwitcher";
import "./MinimizedAudioPlayer.css";

const MinimizedAudioPlayer = ({ onNavigateToStory }) => {
  const { t } = useTranslation();
  const { selectedLanguages, languageData } = useLanguage();
  const {
    currentPlaylist,
    isPlaying,
    currentSegmentIndex,
    play,
    pause,
    setMinimized,
    getCurrentSegment,
    getCurrentVerse,
    audioLanguage,
    setAudioLanguage,
  } = useMediaPlayer();

  // Get languages that have timecode audio available
  const languagesWithAudio = selectedLanguages.filter((langCode) => {
    const langData = languageData[langCode];
    if (!langData) return false;

    const hasOtTimecode =
      langData.ot?.audioFilesetId &&
      ["with-timecode", "audio-with-timecode"].includes(
        langData.ot?.audioCategory,
      );
    const hasNtTimecode =
      langData.nt?.audioFilesetId &&
      ["with-timecode", "audio-with-timecode"].includes(
        langData.nt?.audioCategory,
      );

    return hasOtTimecode || hasNtTimecode;
  });

  if (!currentPlaylist || currentPlaylist.length === 0) {
    return null;
  }

  const currentSegment = getCurrentSegment();
  const currentReference = currentSegment?.reference || "";
  const currentVerseData = getCurrentVerse();
  const currentVerse = currentVerseData
    ? `${currentVerseData.book} ${currentVerseData.chapter}:${currentVerseData.verse}`
    : null;

  // Calculate current section and total sections for display
  const currentSectionNum = currentSegment?.sectionNum || 1;
  const totalSections = currentPlaylist.reduce(
    (max, entry) => Math.max(max, entry.sectionNum || 0),
    0,
  );

  // Get the image URL for the current section
  const currentImageUrl = useMemo(() => {
    if (!currentSegment || !currentSegment.imageUrl) {
      return null;
    }
    return currentSegment.imageUrl;
  }, [currentSegment]);

  const handlePlayPause = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const handleExpand = () => {
    if (onNavigateToStory) {
      onNavigateToStory();
    } else {
      setMinimized(false);
    }
  };

  return (
    <div className="minimized-audio-player" onClick={handleExpand}>
      {currentImageUrl && (
        <div className="minimized-audio-player-image">
          <img
            src={currentImageUrl}
            alt={`${t("fullPlayingPane.sectionAlt")} ${currentSegmentIndex + 1}`}
          />
        </div>
      )}

      <div className="minimized-audio-player-overlay">
        <div className="minimized-audio-player-content">
          <div className="minimized-audio-player-info">
            <div className="minimized-audio-player-title">
              {currentSectionNum}/{totalSections} -{" "}
              {currentVerse || "Loading..."}
            </div>
          </div>

          <div className="minimized-audio-player-controls">
            {/* Show language switcher if multiple languages have suitable timecode audio */}
            {languagesWithAudio.length > 1 && audioLanguage && (
              <div
                onClick={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                <LanguageSwitcher
                  availableLanguages={languagesWithAudio}
                  currentLanguage={audioLanguage}
                  onLanguageChange={setAudioLanguage}
                  compact
                />
              </div>
            )}
            {/* Show fallback badge when primary language doesn't have timecode audio (forced to use fallback) */}
            {audioLanguage &&
              selectedLanguages.length > 1 &&
              !languagesWithAudio.includes(selectedLanguages[0]) && (
                <div className="minimized-audio-player-fallback-badge">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="#555"
                    style={{ display: "block" }}
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <div className="minimized-audio-player-fallback-slash" />
                </div>
              )}

            <button
              className="minimized-audio-player-btn"
              onClick={handlePlayPause}
              aria-label={
                isPlaying ? t("audioPlayer.pause") : t("audioPlayer.play")
              }
            >
              {isPlaying ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ display: "block" }}
                >
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" fill="#fff" />
                </svg>
              ) : (
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ display: "block" }}
                >
                  <path d="M8 5v14l11-7z" fill="#fff" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {isPlaying && <div className="minimized-audio-player-pulse" />}
      </div>
    </div>
  );
};

export default MinimizedAudioPlayer;
