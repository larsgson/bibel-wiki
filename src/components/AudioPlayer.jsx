import React, { useState, useEffect } from "react";
import useMediaPlayer from "../hooks/useMediaPlayer";
import useTranslation from "../hooks/useTranslation";
import useLanguage from "../hooks/useLanguage";
import LanguageSwitcher from "./LanguageSwitcher";
import "./AudioPlayer.css";

const AudioPlayer = () => {
  const { t } = useTranslation();
  const { selectedLanguages, languageData } = useLanguage();
  const {
    currentPlaylist,
    isPlaying,
    isLoading,
    currentSegmentIndex,
    virtualTime,
    totalDuration,
    play,
    pause,
    stop,
    seekTo,
    setMinimized,
    getCurrentSegment,
    getCurrentVerse,
    getSegmentMap,
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

  const [isDragging, setIsDragging] = useState(false);
  const [localTime, setLocalTime] = useState(0);

  useEffect(() => {
    if (!isDragging) {
      setLocalTime(virtualTime);
    }
  }, [virtualTime, isDragging]);

  if (!currentPlaylist || currentPlaylist.length === 0) {
    return null;
  }

  const currentSegment = getCurrentSegment();
  const currentReference =
    currentSegment?.reference || t("audioPlayer.defaultReference");
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

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const handleStop = () => {
    stop();
  };

  const handleSeekChange = (e) => {
    const newTime = parseFloat(e.target.value);
    setLocalTime(newTime);
  };

  const handleSeekMouseDown = () => {
    setIsDragging(true);
  };

  const handleSeekMouseUp = (e) => {
    setIsDragging(false);
    const newTime = parseFloat(e.target.value);
    seekTo(newTime);
  };

  const handleMinimize = () => {
    setMinimized(true);
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Create marks for section boundaries using virtual timeline
  // Only show marks where sectionNum changes (not for every reference within a section)
  const segmentMap = getSegmentMap();
  const segmentMarks = segmentMap
    .map((segment, index) => {
      // Each segment should have virtualStart from the enhanced segment map
      if (segment.virtualStart !== undefined && totalDuration > 0) {
        // Only show mark at start of a new section (first reference of the section)
        const prevSegment = index > 0 ? segmentMap[index - 1] : null;
        const isNewSection =
          !prevSegment || prevSegment.sectionNum !== segment.sectionNum;

        if (isNewSection) {
          return {
            position: (segment.virtualStart / totalDuration) * 100,
            index,
            sectionNum: segment.sectionNum,
          };
        }
      }
      return null;
    })
    .filter(Boolean);

  return (
    <div className="audio-player">
      <div className="audio-player-header">
        <div className="audio-player-info">
          <div className="audio-player-title">
            {currentSectionNum}/{totalSections} -{" "}
            {currentVerse || t("audioPlayer.loadingVerse")}
          </div>
        </div>
        <div className="audio-player-header-right">
          {/* Show language switcher if multiple languages have suitable timecode audio */}
          {languagesWithAudio.length > 1 && audioLanguage && (
            <LanguageSwitcher
              availableLanguages={languagesWithAudio}
              currentLanguage={audioLanguage}
              onLanguageChange={setAudioLanguage}
            />
          )}
          {/* Show fallback badge when primary language doesn't have timecode audio (forced to use fallback) */}
          {audioLanguage &&
            selectedLanguages.length > 1 &&
            !languagesWithAudio.includes(selectedLanguages[0]) && (
              <div className="audio-player-fallback-badge">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="#555"
                  style={{ display: "block" }}
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
                <div className="audio-player-fallback-slash" />
              </div>
            )}
          <button
            className="audio-player-minimize-btn"
            onClick={handleMinimize}
            aria-label={t("audioPlayer.minimize")}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              style={{ display: "block" }}
            >
              <path d="M7 10l5 5 5-5z" fill="#fff" />
            </svg>
          </button>
        </div>
      </div>

      <div className="audio-player-controls">
        <button
          className={`audio-player-btn audio-player-btn-play ${isPlaying ? "playing" : ""}`}
          onClick={handlePlayPause}
          disabled={isLoading}
          aria-label={
            isPlaying ? t("audioPlayer.pause") : t("audioPlayer.play")
          }
        >
          {isPlaying ? (
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              style={{ display: "block" }}
            >
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" fill="#fff" />
            </svg>
          ) : (
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              style={{ display: "block" }}
            >
              <path d="M8 5v14l11-7z" fill="#fff" />
            </svg>
          )}
        </button>

        <button
          className="audio-player-btn audio-player-btn-stop"
          onClick={handleStop}
          disabled={isLoading}
          aria-label={t("audioPlayer.stop")}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: "block" }}
          >
            <rect x="6" y="6" width="12" height="12" fill="#fff" />
          </svg>
        </button>

        <div className="audio-player-progress-container">
          <div className="audio-player-progress-wrapper">
            <input
              type="range"
              className="audio-player-progress"
              min="0"
              max={totalDuration || 100}
              value={localTime}
              onChange={handleSeekChange}
              onMouseDown={handleSeekMouseDown}
              onMouseUp={handleSeekMouseUp}
              onTouchStart={handleSeekMouseDown}
              onTouchEnd={handleSeekMouseUp}
              disabled={isLoading || !totalDuration}
              aria-label={t("audioPlayer.seek")}
            />
            <div
              className="audio-player-progress-fill"
              style={{
                width: `${totalDuration ? (localTime / totalDuration) * 100 : 0}%`,
              }}
            />
            {segmentMarks.map((mark, i) => (
              <div
                key={i}
                className="audio-player-segment-mark"
                style={{ left: `${mark.position}%` }}
              />
            ))}
          </div>
          <div className="audio-player-time">
            <span className="audio-player-time-current">
              {formatTime(localTime)}
            </span>
            <span className="audio-player-time-separator">/</span>
            <span className="audio-player-time-duration">
              {formatTime(totalDuration)}
            </span>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="audio-player-loading">
          {t("audioPlayer.loadingAudio")}
        </div>
      )}
    </div>
  );
};

export default AudioPlayer;
