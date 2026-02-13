import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  Suspense,
} from "react";
import { extractVerses, bsbToPlainText } from "../utils/bibleUtils";
import {
  getExerciseById,
  getDefaultExerciseId,
} from "./exercises/ExerciseRegistry";
import ExerciseTabBar from "./exercises/ExerciseTabBar";
import TextPeek from "./exercises/TextPeek";
import "./LearnVerseView.css";

function LearnVerseView({
  verses,
  sectionsMap,
  selectedLanguages,
  primaryLanguage,
  layoutTheme,
  chapterTextSnapshot,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeExerciseId, setActiveExerciseId] = useState(
    getDefaultExerciseId(),
  );
  const audioRef = useRef(new Audio());
  const verseEndTimeRef = useRef(null);
  const touchStartRef = useRef(null);
  const containerRef = useRef(null);

  const currentVerse = verses[currentIndex];

  // Track the current verse end time for the timeupdate handler
  useEffect(() => {
    verseEndTimeRef.current = currentVerse?.endTime ?? null;
  }, [currentVerse]);

  // Attach timeupdate listener once on mount
  useEffect(() => {
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      if (verseEndTimeRef.current !== null) {
        if (audio.currentTime >= verseEndTimeRef.current) {
          audio.pause();
          setIsPlaying(false);
        }
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
    };
  }, []);

  const playVerse = useCallback(() => {
    const verse = verses[currentIndex];
    const audio = audioRef.current;
    const targetUrl = verse.audioUrl;

    const seekAndPlay = () => {
      audio.currentTime = verse.startTime;
      audio.play();
      setIsPlaying(true);
    };

    if (audio.src && audio.src.includes(targetUrl.split("/").pop())) {
      seekAndPlay();
    } else {
      audio.src = targetUrl;
      audio.addEventListener("loadeddata", seekAndPlay, { once: true });
      audio.load();
    }
  }, [currentIndex, verses]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      playVerse();
    }
  }, [isPlaying, playVerse]);

  const goNext = useCallback(() => {
    if (currentIndex >= verses.length - 1) return;
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    setCurrentIndex((i) => i + 1);
  }, [currentIndex, verses.length]);

  const goPrev = useCallback(() => {
    if (currentIndex <= 0) return;
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    setCurrentIndex((i) => i - 1);
  }, [currentIndex]);

  const handleSelectExercise = useCallback((exerciseId) => {
    setActiveExerciseId(exerciseId);
  }, []);

  // Swipe support — only on non-interactive content areas
  const handleTouchStart = useCallback((e) => {
    touchStartRef.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e) => {
      if (touchStartRef.current === null) return;
      const diff = touchStartRef.current - e.changedTouches[0].clientX;
      touchStartRef.current = null;
      if (Math.abs(diff) < 80) return;
      if (diff > 0) {
        goNext();
      } else {
        goPrev();
      }
    },
    [goNext, goPrev],
  );

  // Extract text data for current verse
  const { primaryText, primaryWords, bsbData, secondaryText } = useMemo(() => {
    if (!currentVerse)
      return {
        primaryText: "",
        primaryWords: [],
        bsbData: null,
        secondaryText: null,
      };

    let pText = "";
    let pWords = [];
    let pBsb = null;
    let sText = null;

    for (const langCode of selectedLanguages) {
      const key = `${langCode}-${currentVerse.book}.${currentVerse.chapter}`;
      const chapterData = chapterTextSnapshot[key];
      if (!chapterData) continue;

      const verseData = extractVerses(
        chapterData,
        currentVerse.verseNum,
        currentVerse.verseNum,
      );
      if (!verseData) continue;

      if (langCode === primaryLanguage) {
        if (
          typeof verseData === "object" &&
          verseData.isBSB &&
          verseData.verses
        ) {
          pBsb = verseData;
          pText = bsbToPlainText(verseData);
        } else {
          pText = String(verseData);
        }
        pWords = pText.split(/\s+/).filter(Boolean);
      } else if (!sText) {
        // First non-primary language is the secondary
        if (
          typeof verseData === "object" &&
          verseData.isBSB &&
          verseData.verses
        ) {
          sText = bsbToPlainText(verseData);
        } else {
          sText = String(verseData);
        }
      }
    }

    return {
      primaryText: pText,
      primaryWords: pWords,
      bsbData: pBsb,
      secondaryText: sText,
    };
  }, [
    currentIndex,
    currentVerse,
    selectedLanguages,
    primaryLanguage,
    chapterTextSnapshot,
  ]);

  // Get active exercise component
  const exerciseEntry = getExerciseById(activeExerciseId);
  const ExerciseComponent = exerciseEntry?.component;

  if (!currentVerse) return null;

  return (
    <div
      className={`learn-verse-view${layoutTheme ? ` theme-${layoutTheme}` : ""}`}
    >
      {/* Desktop sidebar */}
      <div className="learn-verse-sidebar-desktop">
        <ExerciseTabBar
          activeExerciseId={activeExerciseId}
          onSelectExercise={handleSelectExercise}
          layoutTheme={layoutTheme}
        />
      </div>

      <div className="learn-verse-main" ref={containerRef}>
        {/* Image — swipeable area */}
        <div
          className="learn-verse-image-container"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={currentVerse.imageUrl}
            alt={currentVerse.reference}
            className="learn-verse-image"
          />
        </div>

        {/* Reference + Peek */}
        <div className="learn-verse-reference-row">
          <div className="learn-verse-reference">{currentVerse.reference}</div>
          <TextPeek text={primaryText} layoutTheme={layoutTheme} />
        </div>

        {/* Secondary language text (always visible) */}
        {secondaryText && (
          <div className="learn-verse-lang-section secondary">
            <p className="learn-verse-content">{secondaryText}</p>
          </div>
        )}

        {/* Exercise area */}
        <div className="learn-verse-exercise-area">
          <Suspense
            fallback={<div className="learn-exercise-loading">...</div>}
          >
            {ExerciseComponent && (
              <ExerciseComponent
                key={`${activeExerciseId}-${currentIndex}`}
                verse={currentVerse}
                primaryText={primaryText}
                primaryWords={primaryWords}
                secondaryText={secondaryText}
                bsbData={bsbData}
                playVerse={playVerse}
                audioRef={audioRef}
                isPlaying={isPlaying}
                currentIndex={currentIndex}
                layoutTheme={layoutTheme}
                onExerciseComplete={() => {}}
              />
            )}
          </Suspense>
        </div>

        {/* Controls */}
        <div className="learn-verse-controls">
          {currentIndex > 0 ? (
            <button
              className="learn-nav-btn"
              onClick={goPrev}
              aria-label="Previous verse"
            >
              ◀
            </button>
          ) : (
            <div className="learn-nav-spacer" />
          )}

          <button
            className={`learn-play-btn ${isPlaying ? "playing" : ""}`}
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? "⏸" : "▶"}
          </button>

          {currentIndex < verses.length - 1 ? (
            <button
              className="learn-nav-btn"
              onClick={goNext}
              aria-label="Next verse"
            >
              ▶
            </button>
          ) : (
            <div className="learn-nav-spacer" />
          )}
        </div>

        {/* Verse counter */}
        <div className="learn-verse-counter">
          {currentIndex + 1} / {verses.length}
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <div className="learn-verse-tabbar-mobile">
        <ExerciseTabBar
          activeExerciseId={activeExerciseId}
          onSelectExercise={handleSelectExercise}
          layoutTheme={layoutTheme}
        />
      </div>
    </div>
  );
}

export default LearnVerseView;
