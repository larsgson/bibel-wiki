import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import "./StoryViewer.css";
import BibleText from "./BibleText";
import { parseMarkdownIntoSections } from "../utils/markdownParser";
import {
  parseReference,
  getTestament,
  splitReference,
} from "../utils/bibleUtils";
import useLanguage from "../hooks/useLanguage";
import useMediaPlayer from "../hooks/useMediaPlayer";
import useTranslation from "../hooks/useTranslation";
import AudioPlayer from "./AudioPlayer";
import FullPlayingPane from "./FullPlayingPane";
import StorySection from "./MultiLanguage/StorySection";
import BSBModeDialog, { DISPLAY_MODES } from "./BSBModeDialog";

/**
 * Extract raw timing data for a specific reference
 */
const extractRawTimingData = (
  timingData,
  audioFilesetId,
  bookId,
  chapterNum,
  verseSpec,
) => {
  if (!timingData || !audioFilesetId || !timingData[audioFilesetId]) {
    return null;
  }

  const filesetData = timingData[audioFilesetId];
  const searchRef = `${bookId}${chapterNum}:${verseSpec}`;

  for (const [storyNum, storyData] of Object.entries(filesetData)) {
    if (storyData[searchRef]) {
      return {
        reference: searchRef,
        timestamps: storyData[searchRef],
      };
    }
  }

  return null;
};

function StoryViewer({ storyData, onBack }) {
  const { t } = useTranslation();
  const {
    chapterText,
    audioUrls,
    loadAudioUrl,
    selectedLanguage,
    secondaryLanguage,
    selectedLanguages,
    engIsExplicit,
    languageData,
    getStoryMetadata,
    loadChaptersForStory,
    getChapterTextSnapshot,
  } = useLanguage();
  const {
    loadPlaylist,
    isMinimized,
    setMinimized,
    currentSegmentIndex,
    currentPlaylist,
    playSegment,
    audioLanguage,
    setAudioLanguage,
    currentStoryId,
    setCurrentStoryId,
  } = useMediaPlayer();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState(null);
  const [chapterCount, setChapterCount] = useState(0);
  const [audioPlaylistData, setAudioPlaylistData] = useState([]);
  const [storyCapabilities, setStoryCapabilities] = useState({
    hasTimecode: false,
    usesOT: false,
    usesNT: false,
  });
  const [audioAvailability, setAudioAvailability] = useState({});
  const [contentByLanguage, setContentByLanguage] = useState({});
  const [isChaptersLoading, setIsChaptersLoading] = useState(true);
  const [requiredChapters, setRequiredChapters] = useState(new Set());

  // Global BSB display mode state
  const [bsbDisplayMode, setBsbDisplayMode] = useState(DISPLAY_MODES.ENG);
  const [useHebrewOrder, setUseHebrewOrder] = useState(true);
  const [showModeDialog, setShowModeDialog] = useState(false);

  // Refs to prevent duplicate operations
  const playlistLoadedRef = useRef(false);
  const playlistLoadedCountRef = useRef(0);
  const lastAnalyzedLangRef = useRef(null);
  const lastCollectedLangRef = useRef(null);
  const lastParsedSectionsLengthRef = useRef(0);
  const isCollectingPlaylistRef = useRef(false);
  const suppressAutoplayRef = useRef(false); // Suppress autoplay until user clicks a section

  // Memoized story ID for dependency tracking
  const storyId = useMemo(() => storyData?.id || storyData?.path, [storyData]);

  // Check if we're returning to an already-playing story
  const isReturningToPlayingStory = useMemo(() => {
    return (
      currentStoryId === storyId &&
      currentPlaylist &&
      currentPlaylist.length > 0
    );
  }, [currentStoryId, storyId, currentPlaylist]);

  useEffect(() => {
    // If returning to the same story that's already playing, still load content but keep playlist
    if (isReturningToPlayingStory) {
      suppressAutoplayRef.current = false;
      // Mark playlist as already loaded to prevent re-loading
      playlistLoadedRef.current = true;
      loadStory();
      return;
    }

    // Check if another story is playing when we enter this story
    const anotherStoryPlaying =
      currentStoryId !== null &&
      currentStoryId !== storyId &&
      currentPlaylist &&
      currentPlaylist.length > 0;

    if (anotherStoryPlaying) {
      suppressAutoplayRef.current = true;
    } else {
      suppressAutoplayRef.current = false;
    }

    playlistLoadedRef.current = false;
    playlistLoadedCountRef.current = 0;
    lastAnalyzedLangRef.current = null;
    lastCollectedLangRef.current = null;
    lastParsedSectionsLengthRef.current = 0;
    loadStory();
  }, [storyData]);

  // Reload story when languages change
  useEffect(() => {
    if (
      storyData &&
      !isReturningToPlayingStory &&
      !suppressAutoplayRef.current
    ) {
      playlistLoadedRef.current = false;
      playlistLoadedCountRef.current = 0;
      lastAnalyzedLangRef.current = null;
      lastCollectedLangRef.current = null;
      loadPlaylist([], { mode: "replace", autoPlay: false });
      loadStory();
    }
  }, [selectedLanguage, secondaryLanguage]);

  // Track when all required chapters are loaded
  useEffect(() => {
    if (requiredChapters.size === 0) {
      return;
    }

    const loadedChapters = new Set(Object.keys(chapterText));
    const allLoaded = [...requiredChapters].every((ch) =>
      loadedChapters.has(ch),
    );

    if (allLoaded) {
      setIsChaptersLoading(false);
    }
  }, [chapterText, requiredChapters]);

  // Reparse when chapter count changes for multi-language
  useEffect(() => {
    const newCount = Object.keys(chapterText).length;

    if (newCount > 0 && newCount !== chapterCount && content) {
      const parsedByLanguage = {};

      selectedLanguages.forEach((langCode) => {
        const langChapterText = {};
        Object.keys(chapterText).forEach((key) => {
          if (key.startsWith(`${langCode}-`)) {
            const unprefixedKey = key.replace(/^[a-z]+-/, "");
            langChapterText[unprefixedKey] = chapterText[key];
          }
        });

        const parsed = parseMarkdownIntoSections(content, langChapterText);
        parsedByLanguage[langCode] = parsed;

        if (langCode === selectedLanguage) {
          setParsedData(parsed);
        }
      });

      setContentByLanguage({ ...parsedByLanguage });
      setChapterCount(newCount);
    }
  }, [chapterText, content, selectedLanguage, selectedLanguages]);

  const loadStory = async () => {
    setLoading(true);
    setIsChaptersLoading(true);

    try {
      // STEP 1: Fetch markdown ONCE (it's the same file for all languages)
      const response = await fetch(`/templates/OBS/${storyData.path}`);

      if (!response.ok) {
        throw new Error(`Story not found: ${response.status}`);
      }

      const markdown = await response.text();

      if (
        markdown.trim().startsWith("<!doctype") ||
        markdown.trim().startsWith("<!DOCTYPE")
      ) {
        throw new Error("Story file not found");
      }

      setContent(markdown);

      // STEP 2: First parse - extract structure and references (no chapter text yet)
      const initialParsed = parseMarkdownIntoSections(markdown, {});
      setParsedData(initialParsed);

      // Extract all references from the parsed sections
      const allReferences = [];
      initialParsed.sections.forEach((section) => {
        if (section.reference) {
          splitReference(section.reference).forEach((ref) => {
            if (!allReferences.includes(ref)) {
              allReferences.push(ref);
            }
          });
        }
      });

      // Build required chapters set for tracking
      const allRequiredChapters = new Set();
      allReferences.forEach((ref) => {
        const refParsed = parseReference(ref);
        if (refParsed) {
          const { book, chapter } = refParsed;
          selectedLanguages.forEach((langCode) => {
            allRequiredChapters.add(`${langCode}-${book}.${chapter}`);
          });
        }
      });
      setRequiredChapters(allRequiredChapters);

      // Check audio availability for each language
      const availability = {};
      const storyMeta = getStoryMetadata(storyData.id);

      for (const langCode of selectedLanguages) {
        const langData = languageData[langCode];
        availability[langCode] = !!(
          langData?.ot?.audioFilesetId || langData?.nt?.audioFilesetId
        );
      }
      setAudioAvailability(availability);

      // STEP 3: Load all chapters for all languages
      await loadChaptersForStory(allReferences, selectedLanguages);
      const freshChapterText = getChapterTextSnapshot();

      // STEP 4: Second parse - now with chapter text, for each language
      const parsedByLanguage = {};

      for (const langCode of selectedLanguages) {
        // Build language-specific chapter text
        const langChapterText = {};
        Object.keys(freshChapterText).forEach((key) => {
          if (key.startsWith(`${langCode}-`)) {
            langChapterText[key.replace(/^[a-z]+-/, "")] =
              freshChapterText[key];
          }
        });

        // Parse with chapter text for this language
        const parsed = parseMarkdownIntoSections(markdown, langChapterText);
        parsedByLanguage[langCode] = parsed;

        if (langCode === selectedLanguage) {
          setParsedData(parsed);
        }
      }

      setContentByLanguage(parsedByLanguage);
      setChapterCount(Object.keys(freshChapterText).length);
      setIsChaptersLoading(false);
      setError(null);
    } catch (err) {
      setContent("");
      setParsedData(null);
      setContentByLanguage({});
      setAudioAvailability({});
      setError(err.message);
    }
    setLoading(false);
  };

  // Memoized function to collect audio playlist data
  const collectAudioPlaylistData = useCallback(
    async (sections, forAudioLanguage) => {
      // Track which language this collection is for
      const collectionId = forAudioLanguage;
      isCollectingPlaylistRef.current = collectionId;

      try {
        const allPlaylistEntries = [];
        const chaptersNeeded = new Map();

        sections.forEach((section, sectionIndex) => {
          if (!section.reference) return;

          const splitRefs = splitReference(section.reference);

          splitRefs.forEach((ref, refIndex) => {
            const parsed = parseReference(ref);
            if (parsed) {
              const { book, chapter } = parsed;
              const testament = getTestament(book);
              const chapterKey = `${book}.${chapter}`;
              const audioKey = `${forAudioLanguage}-${testament}-${chapterKey}`;

              if (!chaptersNeeded.has(audioKey)) {
                chaptersNeeded.set(audioKey, {
                  book,
                  chapter,
                  testament,
                  audioKey,
                  refs: [],
                });
              }

              chaptersNeeded.get(audioKey).refs.push({
                ref,
                refIndex, // Track order within section for sorting
                sectionNum: sectionIndex + 1,
                imageUrl: section.imageUrl,
                text: section.text,
              });
            }
          });
        });

        for (const [audioKey, chapterInfo] of chaptersNeeded.entries()) {
          const { book, chapter, testament, refs } = chapterInfo;

          let audioEntry = audioUrls[audioKey];

          if (!audioEntry) {
            try {
              audioEntry = await loadAudioUrl(
                book,
                chapter,
                testament,
                forAudioLanguage,
              );
            } catch (err) {
              // Audio not available for this chapter
            }
          }

          if (audioEntry && audioEntry.url) {
            const fullFilename = audioEntry.url.substring(
              audioEntry.url.lastIndexOf("/") + 1,
            );
            const filename = fullFilename.split("?")[0];

            refs.forEach(({ ref, refIndex, sectionNum, imageUrl, text }) => {
              const parsed = parseReference(ref);
              if (!parsed) return;

              const {
                book: refBook,
                chapter: refChapter,
                verseStart,
                verseEnd,
                verses,
              } = parsed;

              let verseSpec;
              if (verses && Array.isArray(verses)) {
                verseSpec = verses.join(",");
              } else if (verseStart === verseEnd) {
                verseSpec = String(verseStart);
              } else {
                verseSpec = `${verseStart}-${verseEnd}`;
              }

              let timingEntry = null;
              if (audioEntry.hasTimecode && audioEntry.timingData) {
                const audioFilesetId =
                  audioEntry.audioFilesetId ||
                  Object.keys(audioEntry.timingData)[0];

                timingEntry = extractRawTimingData(
                  audioEntry.timingData,
                  audioFilesetId,
                  refBook,
                  refChapter,
                  verseSpec,
                );
              }

              // Only add to playlist if we have valid timing data
              if (
                timingEntry &&
                timingEntry.timestamps &&
                timingEntry.timestamps.length >= 2
              ) {
                allPlaylistEntries.push({
                  sectionNum,
                  refIndex,
                  reference: ref,
                  audioFile: filename,
                  audioUrl: audioEntry.url,
                  timingData: timingEntry,
                  book: refBook,
                  chapter: refChapter,
                  testament,
                  imageUrl,
                  text,
                });
              }
            });
          }
        }

        // Sort playlist entries by sectionNum and then by their order within the section
        allPlaylistEntries.sort((a, b) => {
          if (a.sectionNum !== b.sectionNum) {
            return a.sectionNum - b.sectionNum;
          }
          // Within same section, maintain the order they were added (by refIndex)
          return (a.refIndex || 0) - (b.refIndex || 0);
        });

        // Only set data if this collection is still the current one
        if (isCollectingPlaylistRef.current === collectionId) {
          setAudioPlaylistData(allPlaylistEntries);
          isCollectingPlaylistRef.current = null;
        }
      } catch (err) {
        // Only clear if this collection is still current
        if (isCollectingPlaylistRef.current === collectionId) {
          isCollectingPlaylistRef.current = null;
        }
      }
    },
    [audioUrls, loadAudioUrl],
  );

  // Memoized function to analyze story capabilities
  const analyzeStoryCapabilities = useCallback(
    (sections) => {
      const cachedMetadata = getStoryMetadata(storyId);
      const langData = languageData[selectedLanguage];

      // If no cached metadata, analyze sections directly to determine testament usage
      let testamentsInfo = cachedMetadata?.testaments;

      if (!testamentsInfo) {
        // Analyze sections to determine which testaments this story uses
        const ntBooks = [
          "MAT",
          "MRK",
          "LUK",
          "JHN",
          "ACT",
          "ROM",
          "1CO",
          "2CO",
          "GAL",
          "EPH",
          "PHP",
          "COL",
          "1TH",
          "2TH",
          "1TI",
          "2TI",
          "TIT",
          "PHM",
          "HEB",
          "JAS",
          "1PE",
          "2PE",
          "1JN",
          "2JN",
          "3JN",
          "JUD",
          "REV",
        ];

        let usesOT = false;
        let usesNT = false;

        sections.forEach((section) => {
          if (section.reference) {
            const bookMatch = section.reference.match(/^([A-Z0-9]+)\s+/i);
            if (bookMatch) {
              const book = bookMatch[1].toUpperCase();
              if (ntBooks.includes(book)) {
                usesNT = true;
              } else {
                usesOT = true;
              }
            }
          }
        });

        testamentsInfo = { usesOT, usesNT };
      }

      if (!langData) {
        setStoryCapabilities({
          hasTimecode: false,
          usesOT: testamentsInfo.usesOT,
          usesNT: testamentsInfo.usesNT,
        });
        return;
      }

      const testamentsToCheck = [];
      if (testamentsInfo.usesOT) testamentsToCheck.push("ot");
      if (testamentsInfo.usesNT) testamentsToCheck.push("nt");

      // Check if ANY of the selected languages has audio with timecodes for all required testaments
      let hasTimecode = false;
      let preferredAudioLanguage = null;

      for (const checkLang of selectedLanguages) {
        const checkLangData = languageData[checkLang];
        if (!checkLangData) continue;

        let langHasAllTestaments = true;

        for (const testament of testamentsToCheck) {
          const testamentData = checkLangData[testament];

          if (!testamentData || !testamentData.audioFilesetId) {
            langHasAllTestaments = false;
            break;
          }

          const hasTimecodeForTestament = [
            "with-timecode",
            "audio-with-timecode",
          ].includes(testamentData.audioCategory);

          if (!hasTimecodeForTestament) {
            langHasAllTestaments = false;
            break;
          }
        }

        if (langHasAllTestaments) {
          hasTimecode = true;
          preferredAudioLanguage = checkLang;
          break;
        }
      }

      const capabilities = {
        hasTimecode,
        usesOT: testamentsInfo.usesOT,
        usesNT: testamentsInfo.usesNT,
        preferredAudioLanguage,
      };

      setStoryCapabilities(capabilities);
    },
    [storyId, selectedLanguages, languageData, getStoryMetadata],
  );

  // Analyze story capabilities - with deduplication
  useEffect(() => {
    if (
      parsedData &&
      parsedData.sections &&
      parsedData.sections.length > 0 &&
      selectedLanguage &&
      languageData &&
      languageData[selectedLanguage]
    ) {
      // Skip if we already analyzed for this language and sections haven't changed
      const sectionsLength = parsedData.sections.length;
      if (
        lastAnalyzedLangRef.current === selectedLanguage &&
        lastParsedSectionsLengthRef.current === sectionsLength
      ) {
        return;
      }

      lastAnalyzedLangRef.current = selectedLanguage;
      lastParsedSectionsLengthRef.current = sectionsLength;
      analyzeStoryCapabilities(parsedData.sections);
    }
  }, [parsedData, selectedLanguage, languageData, analyzeStoryCapabilities]);

  // Initialize audioLanguage when story capabilities are determined
  useEffect(() => {
    if (storyCapabilities.hasTimecode && !audioLanguage) {
      // Use the preferred audio language determined during capability analysis
      // This is the first language that has audio for ALL testaments the story needs
      if (storyCapabilities.preferredAudioLanguage) {
        setAudioLanguage(storyCapabilities.preferredAudioLanguage);
      }
    }
  }, [
    storyCapabilities.hasTimecode,
    storyCapabilities.preferredAudioLanguage,
    audioLanguage,
    languageData,
    setAudioLanguage,
  ]);

  // Collect audio playlist - with deduplication
  useEffect(() => {
    if (
      parsedData &&
      parsedData.sections &&
      parsedData.sections.length > 0 &&
      storyCapabilities.hasTimecode &&
      audioLanguage
    ) {
      // Skip if we already collected for this language
      if (lastCollectedLangRef.current === audioLanguage) {
        return;
      }

      // Reset playlist loaded flag when language changes so new playlist will be loaded
      playlistLoadedRef.current = false;
      playlistLoadedCountRef.current = 0;

      lastCollectedLangRef.current = audioLanguage;
      collectAudioPlaylistData(parsedData.sections, audioLanguage);
    } else if (!storyCapabilities.hasTimecode) {
      setAudioPlaylistData([]);
      lastCollectedLangRef.current = null;
    }
  }, [
    parsedData,
    audioLanguage,
    storyCapabilities.hasTimecode,
    collectAudioPlaylistData,
  ]);

  // Load playlist and auto-play when audio data is ready AND chapters are loaded
  useEffect(() => {
    // Skip if returning to an already-playing story
    if (isReturningToPlayingStory) {
      return;
    }

    // Skip loading playlist if autoplay is suppressed (another story was playing when we entered)
    if (suppressAutoplayRef.current) {
      return;
    }

    const shouldLoad =
      !playlistLoadedRef.current ||
      (audioPlaylistData.length > playlistLoadedCountRef.current &&
        playlistLoadedCountRef.current > 0);

    if (
      audioPlaylistData.length > 0 &&
      storyCapabilities.hasTimecode &&
      !isChaptersLoading &&
      shouldLoad
    ) {
      playlistLoadedRef.current = true;
      playlistLoadedCountRef.current = audioPlaylistData.length;
      // Set the current story ID and data before loading the playlist
      setCurrentStoryId(storyId, storyData);

      // Check if fallback language is being used (compute inline to avoid ordering issues)
      // Only consider it fallback if English was NOT explicitly selected by the user
      let usingFallback = false;
      if (selectedLanguages.length > 1 && !engIsExplicit) {
        const fallbackLang = selectedLanguages[selectedLanguages.length - 1];
        const fallbackSections = contentByLanguage[fallbackLang]?.sections;
        if (fallbackSections) {
          for (let i = 0; i < fallbackSections.length; i++) {
            const fallbackHasText = fallbackSections[i]?.text?.trim();
            const nonFallbackHasText = selectedLanguages
              .slice(0, -1)
              .some((lang) => {
                return contentByLanguage[lang]?.sections?.[i]?.text?.trim();
              });
            if (!nonFallbackHasText && fallbackHasText) {
              usingFallback = true;
              break;
            }
          }
        }
      }

      // Don't auto-play if fallback language is being used
      loadPlaylist(audioPlaylistData, {
        mode: "replace",
        autoPlay: !usingFallback,
      });

      // When fallback is used, show minimized player instead of full mode
      if (usingFallback) {
        setMinimized(true);
      }
    }
  }, [
    audioPlaylistData,
    loadPlaylist,
    storyCapabilities.hasTimecode,
    isChaptersLoading,
    isReturningToPlayingStory,
    storyId,
    setCurrentStoryId,
    selectedLanguages,
    contentByLanguage,
    engIsExplicit,
  ]);

  // Separate effect to clear playlist when timecode becomes unavailable
  useEffect(() => {
    // Don't clear playlist if autoplay is suppressed (another story is playing)
    if (suppressAutoplayRef.current) {
      return;
    }

    // Don't clear if returning to a playing story (capabilities not yet analyzed)
    if (isReturningToPlayingStory) {
      return;
    }

    // Only clear if this story's playlist is loaded (not another story's)
    if (
      !storyCapabilities.hasTimecode &&
      currentPlaylist &&
      currentPlaylist.length > 0 &&
      currentStoryId === storyId
    ) {
      loadPlaylist([], { mode: "replace", autoPlay: false });
    }
  }, [
    storyCapabilities.hasTimecode,
    currentPlaylist,
    loadPlaylist,
    currentStoryId,
    storyId,
    isReturningToPlayingStory,
  ]);

  // Memoize sectionsMap to avoid recreating on every render
  const sectionsMap = useMemo(() => {
    const map = {};
    selectedLanguages.forEach((langCode) => {
      const langParsed = contentByLanguage[langCode];
      if (langParsed?.sections) {
        map[langCode] = langParsed.sections;
      }
    });
    return map;
  }, [selectedLanguages, contentByLanguage]);

  if (loading) {
    return <div className="story-loading">{t("storyViewer.loadingStory")}</div>;
  }

  // Error state - story not found
  if (error) {
    return (
      <div className="story-viewer">
        <div className="story-header">
          <button className="back-button" onClick={onBack}>
            ←
          </button>
          <h1 className="story-title">{storyData.title}</h1>
        </div>
        <div className="story-hero-image">
          <img
            src={storyData.image || "/navIcons/000-01.png"}
            alt={storyData.title}
            onError={(e) => {
              e.target.src = "/navIcons/000-01.png";
            }}
          />
        </div>
        <div className="story-content">
          <div className="story-error">
            <h2>{t("storyViewer.errorTitle")}</h2>
            <p>{t("storyViewer.errorMessage")}</p>
            <p className="story-error-detail">{t("storyViewer.errorDetail")}</p>
          </div>
        </div>
      </div>
    );
  }

  // Display sections
  if (!parsedData || !parsedData.sections || parsedData.sections.length === 0) {
    return (
      <div className="story-viewer">
        <div className="story-header">
          <button className="back-button" onClick={onBack}>
            ←
          </button>
          <h1 className="story-title">{storyData.title}</h1>
        </div>
        <div className="story-content">
          <p>{t("storyViewer.noSections")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="story-viewer">
      <div className="story-header">
        <button className="back-button" onClick={onBack}>
          ←
        </button>
        <h1 className="story-title">{parsedData.title || storyData.title}</h1>
      </div>

      {/* Conditional rendering based on player state */}
      {!isMinimized && currentPlaylist && currentPlaylist.length > 0 ? (
        // FULL PLAYER MODE - show only playing pane (requires timecode to have playlist)
        <div className="story-content story-content-full-player">
          <FullPlayingPane
            sectionsMap={sectionsMap}
            selectedLanguages={selectedLanguages}
            primaryLanguage={selectedLanguage}
          />
        </div>
      ) : (
        // DEFAULT MODE - show all story sections with multi-language support
        <div className="story-content story-sections-vertical">
          {parsedData.sections.map((section, index) => {
            const isPlaying =
              currentPlaylist &&
              currentPlaylist.length > 0 &&
              currentSegmentIndex >= 0 &&
              currentPlaylist[currentSegmentIndex]?.sectionNum === index + 1;

            // Skip if no sections available
            if (Object.keys(sectionsMap).length === 0) {
              return null;
            }

            // Check if audio fallback is being used (preferred audio language is not primary)
            const isAudioFallback =
              storyCapabilities.preferredAudioLanguage &&
              storyCapabilities.preferredAudioLanguage !== selectedLanguage;

            return (
              <StorySection
                key={index}
                section={section}
                sectionIndex={index}
                selectedLanguages={selectedLanguages}
                primaryLanguage={selectedLanguage}
                sectionsMap={sectionsMap}
                isPlaying={isPlaying}
                audioFallback={isAudioFallback}
                bsbDisplayMode={bsbDisplayMode}
                useHebrewOrder={useHebrewOrder}
                isOldTestament={
                  storyCapabilities.usesOT && !storyCapabilities.usesNT
                }
                engIsExplicit={engIsExplicit}
                onModeIndicatorClick={() => setShowModeDialog(true)}
                onSectionClick={(sectionIdx) => {
                  // If this story's playlist is already loaded, just play the segment
                  if (
                    currentStoryId === storyId &&
                    currentPlaylist &&
                    currentPlaylist.length > 0
                  ) {
                    const playlistIdx = currentPlaylist.findIndex(
                      (entry) => entry.sectionNum === sectionIdx + 1,
                    );
                    if (playlistIdx >= 0) {
                      setMinimized(false);
                      playSegment(playlistIdx);
                    }
                  } else if (audioPlaylistData.length > 0) {
                    // Another story is playing or no playlist loaded yet
                    // Load this story's playlist and start at the clicked section
                    suppressAutoplayRef.current = false; // Clear suppression on explicit click
                    setCurrentStoryId(storyId, storyData);
                    const playlistIdx = audioPlaylistData.findIndex(
                      (entry) => entry.sectionNum === sectionIdx + 1,
                    );
                    const startIndex = playlistIdx >= 0 ? playlistIdx : 0;
                    loadPlaylist(audioPlaylistData, {
                      mode: "replace",
                      autoPlay: false,
                    });
                    // Use setTimeout to ensure playlist is loaded before playing
                    setTimeout(() => {
                      setMinimized(false);
                      playSegment(startIndex);
                    }, 100);
                  }
                }}
                isLoading={isChaptersLoading}
              />
            );
          })}
        </div>
      )}

      {/* Audio Player - show full player when not minimized (minimized player is in App.jsx) */}
      {currentPlaylist && currentPlaylist.length > 0 && !isMinimized && (
        <AudioPlayer />
      )}

      {/* BSB Mode Dialog */}
      <BSBModeDialog
        isOpen={showModeDialog}
        onClose={() => setShowModeDialog(false)}
        displayMode={bsbDisplayMode}
        onModeChange={(mode) => setBsbDisplayMode(mode)}
        useHebrewOrder={useHebrewOrder}
        onHebrewOrderChange={(value) => setUseHebrewOrder(value)}
        isOldTestament={storyCapabilities.usesOT && !storyCapabilities.usesNT}
      />
    </div>
  );
}

export default StoryViewer;
