import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  Suspense,
} from "react";
import {
  extractVerses,
  bsbToPlainText,
  getTestament,
} from "../utils/bibleUtils";
import {
  getExerciseById,
  getDefaultExerciseId,
} from "./exercises/ExerciseRegistry";
import ExerciseTabBar from "./exercises/ExerciseTabBar";
import TextPeek from "./exercises/TextPeek";
import useLanguage from "../hooks/useLanguage";
import "./LearnVerseView.css";
import "./exercises/word-tile.css";

function LearnVerseView({
  verses,
  sectionsMap,
  selectedLanguages,
  primaryLanguage,
  layoutTheme,
  chapterTextSnapshot,
  storySetId,
}) {
  const isRTL =
    primaryLanguage === "heb" ||
    primaryLanguage === "arb" ||
    primaryLanguage === "ara";
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

  // Secondary language audio
  const { loadAudioUrl } = useLanguage();
  const secondaryAudioRef = useRef(new Audio());
  const secondaryEndTimeRef = useRef(null);
  const [isPlayingSecondary, setIsPlayingSecondary] = useState(false);
  const [secondaryAudioInfo, setSecondaryAudioInfo] = useState(null);

  const secondaryLanguage = useMemo(() => {
    return selectedLanguages.find((l) => l !== primaryLanguage) || null;
  }, [selectedLanguages, primaryLanguage]);

  // Attach timeupdate listener for secondary audio once on mount
  useEffect(() => {
    const audio = secondaryAudioRef.current;
    const handleTimeUpdate = () => {
      if (secondaryEndTimeRef.current !== null) {
        if (audio.currentTime >= secondaryEndTimeRef.current) {
          audio.pause();
          setIsPlayingSecondary(false);
        }
      }
    };
    const handleEnded = () => setIsPlayingSecondary(false);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
    };
  }, []);

  // Load secondary audio info when verse or secondary language changes
  useEffect(() => {
    if (!secondaryLanguage || !currentVerse) {
      setSecondaryAudioInfo(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const testament = getTestament(currentVerse.book);
        const entry = await loadAudioUrl(
          currentVerse.book,
          currentVerse.chapter,
          testament,
          secondaryLanguage,
          storySetId,
        );
        if (
          cancelled ||
          !entry?.url ||
          !entry.hasTimecode ||
          !entry.timingData
        ) {
          if (!cancelled) setSecondaryAudioInfo(null);
          return;
        }
        // Find verse timing
        const verseSpec = String(currentVerse.verseNum);
        const audioFilesetId =
          entry.audioFilesetId || Object.keys(entry.timingData)[0];
        // Check direct-audio format first
        const directKey = `${currentVerse.book} ${currentVerse.chapter}`;
        const vts = entry.timingData[directKey]?.verseTimestamps;
        let startTime = null;
        let endTime = null;
        if (vts) {
          startTime = vts[verseSpec];
          const nextVerse = String(currentVerse.verseNum + 1);
          endTime =
            vts[nextVerse] ?? (startTime != null ? startTime + 10 : null);
        } else if (audioFilesetId && entry.timingData[audioFilesetId]) {
          // DBT format
          const searchRef = `${currentVerse.book}${currentVerse.chapter}:${verseSpec}`;
          for (const storyData of Object.values(
            entry.timingData[audioFilesetId],
          )) {
            if (storyData[searchRef]) {
              const ts = storyData[searchRef];
              if (ts.length >= 2) {
                startTime = ts[0];
                endTime = ts[1];
              }
              break;
            }
          }
        }
        if (!cancelled && startTime != null) {
          setSecondaryAudioInfo({ url: entry.url, startTime, endTime });
        } else if (!cancelled) {
          setSecondaryAudioInfo(null);
        }
      } catch {
        if (!cancelled) setSecondaryAudioInfo(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [secondaryLanguage, currentVerse, loadAudioUrl, storySetId]);

  const playSecondary = useCallback(() => {
    if (!secondaryAudioInfo) return;
    const audio = secondaryAudioRef.current;
    secondaryEndTimeRef.current = secondaryAudioInfo.endTime;

    const seekAndPlay = () => {
      audio.currentTime = secondaryAudioInfo.startTime;
      audio.play();
      setIsPlayingSecondary(true);
    };

    if (
      audio.src &&
      audio.src.includes(secondaryAudioInfo.url.split("/").pop())
    ) {
      seekAndPlay();
    } else {
      audio.src = secondaryAudioInfo.url;
      audio.addEventListener("loadeddata", seekAndPlay, { once: true });
      audio.load();
    }
  }, [secondaryAudioInfo]);

  const goNext = useCallback(() => {
    if (currentIndex >= verses.length - 1) return;
    audioRef.current?.pause();
    secondaryAudioRef.current?.pause();
    setIsPlaying(false);
    setIsPlayingSecondary(false);
    setCurrentIndex((i) => i + 1);
  }, [currentIndex, verses.length]);

  const goPrev = useCallback(() => {
    if (currentIndex <= 0) return;
    audioRef.current?.pause();
    secondaryAudioRef.current?.pause();
    setIsPlaying(false);
    setIsPlayingSecondary(false);
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
          variant="desktop"
        />
      </div>

      <div className="learn-verse-main" ref={containerRef}>
        {/* Image — swipeable + clickable to play */}
        <div
          className={`learn-verse-image-container${isPlaying ? " playing" : ""}`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={togglePlay}
          role="button"
          tabIndex={0}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          <img
            src={currentVerse.imageUrl}
            alt={currentVerse.reference}
            className="learn-verse-image"
          />
          <span className="learn-verse-image-play-icon">
            {isPlaying ? "⏸" : "▶"}
          </span>

          {/* Navigation arrows — anchored to image */}
          {currentIndex > 0 && (
            <button
              className="learn-nav-edge learn-nav-prev"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              aria-label="Previous verse"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
          {currentIndex < verses.length - 1 && (
            <button
              className="learn-nav-edge learn-nav-next"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              aria-label="Next verse"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </div>

        {/* Reference + Peek */}
        <div className="learn-verse-reference-row">
          <div className="learn-verse-reference">{currentVerse.reference}</div>
          <TextPeek text={primaryText} layoutTheme={layoutTheme} />
        </div>

        {/* Secondary language text (hidden during sentence-builder) */}
        {secondaryText && activeExerciseId !== "sentence-builder" && (
          <div className="learn-verse-lang-section secondary">
            <p className="learn-verse-content">{secondaryText}</p>
            {secondaryAudioInfo && (
              <div className="learn-verse-secondary-audio">
                <button
                  className={`learn-verse-secondary-play-btn${isPlayingSecondary ? " playing" : ""}`}
                  onClick={playSecondary}
                  aria-label="Play secondary language audio"
                >
                  {isPlayingSecondary ? "⏸" : "▶"}
                </button>
              </div>
            )}
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
                isRTL={isRTL}
                currentIndex={currentIndex}
                layoutTheme={layoutTheme}
                onExerciseComplete={() => {}}
              />
            )}
          </Suspense>
        </div>

        {/* Verse counter */}
        <div className="learn-verse-counter">
          {currentIndex + 1} / {verses.length}
        </div>

        {/* Edge-anchored navigation arrows */}
        {currentIndex > 0 && (
          <button
            className="learn-nav-edge learn-nav-prev"
            onClick={goPrev}
            aria-label="Previous verse"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}
        {currentIndex < verses.length - 1 && (
          <button
            className="learn-nav-edge learn-nav-next"
            onClick={goNext}
            aria-label="Next verse"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
      </div>

      {/* Mobile bottom tab bar */}
      <div className="learn-verse-tabbar-mobile">
        <ExerciseTabBar
          activeExerciseId={activeExerciseId}
          onSelectExercise={handleSelectExercise}
          layoutTheme={layoutTheme}
          variant="mobile"
        />
      </div>
    </div>
  );
}

export default LearnVerseView;
