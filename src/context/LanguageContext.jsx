import React, { useState, useEffect, useCallback, useRef } from "react";
import { parseReference, getTestament } from "../utils/bibleUtils";
import { loadBSBChapter } from "../helpers/bsbDataApi";

const LanguageContext = React.createContext([{}, () => {}]);

// Priority-ordered list of language filesets to probe
// Note: Proxy auto-adds _ET suffix for type=text, so these are base IDs
const ENGLISH_FILESET_CANDIDATES = {
  nt: [
    "ENGESVN", // English Standard Version NT - text
  ],
  ot: [
    "ENGESVO", // English Standard Version OT - text
  ],
};

const FRENCH_FILESET_CANDIDATES = {
  nt: [
    "FRNTLS", // French Louis Segond NT - text
    "FRNLSV", // French La Sainte Bible NT - text
  ],
  ot: [
    "FRNTLS", // French Louis Segond OT - text
    "FRNLSV", // French La Sainte Bible OT - text
    "FRNDBY", // French Darby OT - text
  ],
};

const LanguageProvider = ({
  children,
  initialLanguage = "fra",
  initialSecondaryLanguage = null,
}) => {
  // Helper function to compute active languages array (ensures no duplicates)
  // Returns { languages: [...], engIsExplicit: boolean }
  // engIsExplicit is true if English was explicitly selected (not just auto-added as fallback)
  const getActiveLanguages = (primary, secondary) => {
    const languages = new Set();

    // Track if English is explicitly selected (primary or secondary)
    const engIsExplicit = primary === "eng" || secondary === "eng";

    // Always add primary first
    languages.add(primary);

    // Add secondary if different from primary
    if (secondary && secondary !== primary) {
      languages.add(secondary);
    }

    // Always include English if not already present (as fallback)
    languages.add("eng");

    return { languages: Array.from(languages), engIsExplicit };
  };
  // Helper function to parse TOML files
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

  const initialActive = getActiveLanguages(
    initialLanguage,
    initialSecondaryLanguage,
  );
  const [state, setState] = useState({
    selectedLanguage: initialLanguage, // Primary language (for backward compatibility)
    secondaryLanguage: initialSecondaryLanguage, // Secondary language
    selectedLanguages: initialActive.languages, // Array of all active languages
    engIsExplicit: initialActive.engIsExplicit, // True if English was explicitly selected (not just fallback)
    availableLanguages: [],
    languageData: {}, // Bible data for each language: { langCode: { ot: {...}, nt: {...} } }
    languageNames: {}, // Language display names: { langCode: { english: "...", vernacular: "..." } }
    chapterText: {}, // Loaded chapter text: { "lang-GEN.1": "chapter content...", ... } - NOW LANGUAGE-SPECIFIC
    audioUrls: {}, // Cached audio URLs: { "lang-testament-BOOK.chapter": "url", ... }
    timingFileCache: {}, // Cached timing files: { "lang-testament": timingData }
    storyMetadata: {}, // Lightweight story metadata cache: { storyId: { testaments, title } } - ~50KB for 1000 stories vs ~10MB if caching parsed sections
    isLoadingSummary: false,
    summaryError: null,
    isLoadingChapter: false,
    isLoadingAudio: false,
    probeStatus: {}, // Track probe results: { langCode: { testament: { filesetId: status } } }
  });

  // Use ref to track loading chapters to avoid stale state issues
  const loadingChaptersRef = useRef({});
  const chapterTextRef = useRef({});
  const selectedLanguageRef = useRef(initialLanguage);
  const secondaryLanguageRef = useRef(initialSecondaryLanguage);
  const selectedLanguagesRef = useRef(initialActive.languages);
  const languageDataRef = useRef({});
  const loadingAudioRef = useRef({}); // Track loading audio URLs
  const audioUrlsRef = useRef({}); // Track cached audio URLs
  const timingFileCacheRef = useRef({}); // Track cached timing files
  const timingManifestRef = useRef({}); // Track loaded ALL-timings manifests per template
  const preloadStartedRef = useRef(new Set());
  const directAudioManifestRef = useRef(null);
  const directAudioConfigRef = useRef({}); // Cached audio.json per language
  const initializationStartedRef = useRef(false);

  const updateState = (updates) => {
    setState((prevState) => {
      const newState = { ...prevState, ...updates };
      // Keep refs in sync with state
      if (updates.chapterText) {
        chapterTextRef.current = newState.chapterText;
      }
      if (updates.languageData) {
        languageDataRef.current = newState.languageData;
      }
      if (updates.selectedLanguage) {
        selectedLanguageRef.current = updates.selectedLanguage;
      }
      if (updates.secondaryLanguage !== undefined) {
        secondaryLanguageRef.current = updates.secondaryLanguage;
      }
      if (updates.selectedLanguages) {
        selectedLanguagesRef.current = updates.selectedLanguages;
      }
      if (updates.audioUrls) {
        audioUrlsRef.current = newState.audioUrls;
      }
      if (updates.timingFileCache) {
        timingFileCacheRef.current = newState.timingFileCache;
      }
      return newState;
    });
  };

  // Get story metadata from cache
  const getStoryMetadata = useCallback(
    (storyId) => {
      return state.storyMetadata[storyId] || null;
    },
    [state.storyMetadata],
  );

  // Load summary.json to get available languages
  const loadSummary = useCallback(async () => {
    updateState({ isLoadingSummary: true, summaryError: null });

    try {
      // Load both summaries in parallel
      const [response, directResponse] = await Promise.all([
        fetch("/ALL-langs-data/summary.json"),
        fetch("/direct-audio/manifest.json").catch(() => null),
      ]);
      if (!response.ok) {
        throw new Error(`Failed to load summary.json: ${response.status}`);
      }

      const summaryData = await response.json();

      // Load direct-audio manifest (optional — no error if missing)
      let directAudioManifest = null;
      if (directResponse && directResponse.ok) {
        const directData = await directResponse.json();
        directAudioManifest = directData.languages || null;
      }
      directAudioManifestRef.current = directAudioManifest;

      // Extract language list from nested structure
      // Structure: canons -> nt/ot -> category -> langCode
      const languages = new Set();

      if (summaryData.canons) {
        ["nt", "ot"].forEach((testament) => {
          if (summaryData.canons[testament]) {
            const testamentData = summaryData.canons[testament];
            Object.keys(testamentData).forEach((category) => {
              if (typeof testamentData[category] === "object") {
                Object.keys(testamentData[category]).forEach((langCode) => {
                  languages.add(langCode);
                });
              }
            });
          }
        });
      }

      // Merge languages from direct-audio manifest
      if (directAudioManifest) {
        Object.keys(directAudioManifest).forEach((langCode) => {
          languages.add(langCode);
        });
      }

      const languagesArray = Array.from(languages).sort();

      // Extract language names
      const languageNames = {};
      if (summaryData.canons) {
        ["nt", "ot"].forEach((testament) => {
          if (summaryData.canons[testament]) {
            const testamentData = summaryData.canons[testament];
            Object.keys(testamentData).forEach((category) => {
              if (typeof testamentData[category] === "object") {
                Object.keys(testamentData[category]).forEach((langCode) => {
                  const langInfo = testamentData[category][langCode];
                  if (langInfo && !languageNames[langCode]) {
                    languageNames[langCode] = {
                      english: langInfo.n || "",
                      vernacular: langInfo.v || "",
                    };
                  }
                });
              }
            });
          }
        });
      }

      updateState({
        availableLanguages: languagesArray,
        languageNames: languageNames,
        isLoadingSummary: false,
        summaryError: null,
      });

      return { languages: languagesArray, languageNames };
    } catch (error) {
      updateState({
        isLoadingSummary: false,
        summaryError: error.message,
      });
      throw error;
    }
  }, []);

  // Probe a specific fileset to check if it works with the DBT API
  // NOTE: The proxy automatically adds _ET for type=text, so we just pass the base ID
  const probeFileset = useCallback(async (filesetId, testament = "nt") => {
    const testBook = testament === "nt" ? "MAT" : "GEN";
    const testChapter = "1";

    try {
      // Proxy will automatically add _ET suffix for type=text
      const url = `/.netlify/functions/dbt-proxy?type=text&fileset_id=${filesetId}&book_id=${testBook}&chapter_id=${testChapter}`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          return { success: true, filesetId, needsET: false };
        }
      }

      return { success: false, filesetId, error: `HTTP ${response.status}` };
    } catch (error) {
      return { success: false, filesetId, error: error.message };
    }
  }, []);

  // Probe multiple filesets and return the first working one
  const probeFilesets = useCallback(
    async (filesetCandidates, testament = "nt") => {
      for (const filesetId of filesetCandidates) {
        const result = await probeFileset(filesetId, testament);
        if (result.success) {
          return result;
        }
      }

      return null;
    },
    [probeFileset],
  );

  // Load ALL-timings manifest for a specific template, cached per template
  const loadTimingManifest = useCallback(async (storySetId = "OBS") => {
    if (timingManifestRef.current[storySetId]) {
      return timingManifestRef.current[storySetId];
    }

    try {
      const manifestPath = `/templates/${storySetId}/ALL-timings/manifest.json`;
      const manifestResponse = await fetch(manifestPath);

      if (!manifestResponse.ok) {
        console.warn(`Failed to load ALL-timings manifest for ${storySetId}`);
        return null;
      }

      const manifest = await manifestResponse.json();
      timingManifestRef.current[storySetId] = manifest;
      return manifest;
    } catch (error) {
      console.warn(
        `Error loading ALL-timings manifest for ${storySetId}:`,
        error,
      );
      return null;
    }
  }, []);

  // Build a direct audio URL from an audio.json config
  const buildDirectAudioUrl = useCallback((audioConfig, bookId, chapter) => {
    if (!audioConfig) return null;
    if (audioConfig.type === "wordproject") {
      const bookIdx = audioConfig.bookIndex?.[bookId];
      if (!bookIdx) return null;
      return `${audioConfig.baseUrl}${bookIdx}/${chapter}.mp3`;
    }
    if (audioConfig.type === "audiotreasure") {
      const bookName = audioConfig.bookNames?.[bookId];
      if (!bookName) return null;
      return `${audioConfig.baseUrl}${bookName}_${chapter}.mp3`;
    }
    if (audioConfig.type === "sermon-online") {
      const bookInfo = audioConfig.books?.[bookId];
      if (!bookInfo) return null;
      const padded2 = String(chapter).padStart(2, "0");
      const padded3 = String(chapter).padStart(3, "0");
      return `${audioConfig.baseUrl}${bookInfo.code}${padded2}-${bookInfo.title}_Kapitel-${padded3}.mp3`;
    }
    return null;
  }, []);

  // Attach direct-audio config to langData if available in manifest
  const attachDirectAudioConfig = useCallback(async (langCode, langData) => {
    const manifest = directAudioManifestRef.current;
    if (!manifest?.[langCode]) return;

    const langManifest = manifest[langCode];

    // Load and cache audio.json if this language has audio
    if (langManifest.audio) {
      let audioConfig = directAudioConfigRef.current[langCode];
      if (!audioConfig) {
        try {
          const resp = await fetch(`/direct-audio/${langCode}/audio.json`);
          if (resp.ok) {
            audioConfig = await resp.json();
            directAudioConfigRef.current[langCode] = audioConfig;
          }
        } catch (e) {
          console.warn(
            `Failed to load direct-audio config for ${langCode}:`,
            e,
          );
        }
      }

      if (audioConfig) {
        // Ensure testament entries exist for direct-audio languages
        for (const t of audioConfig.testaments || []) {
          if (!langData[t]) {
            langData[t] = {};
          }
          langData[t].directAudio = audioConfig;
        }
      }
    }

    // Mark direct text/timecodes availability on testament data
    if (langManifest.text || langManifest.timecodes) {
      // Default to nt if no testament data exists yet
      if (!langData.nt) langData.nt = {};
      if (langManifest.text) langData.nt.directText = true;
      if (langManifest.timecodes) langData.nt.directTimecodes = true;
    }
  }, []);

  // Load bible-data.json for a specific language using manifest
  const loadLanguageData = useCallback(
    async (langCode) => {
      // Try manifest-based loading first for all languages
      try {
        // Load the manifest to find which categories have this language
        const manifestPath = `/ALL-langs-data/manifest.json`;
        const manifestResponse = await fetch(manifestPath);

        if (!manifestResponse.ok) {
          throw new Error("Failed to load manifest.json");
        }

        const manifest = await manifestResponse.json();
        const langData = {};
        const testaments = ["ot", "nt"];

        // Helper function to parse text fileset ID from data.json
        const parseTextFilesetId = (textValue, distinctId) => {
          if (!textValue) return null;
          if (textValue.endsWith(".txt")) {
            const suffix = textValue.replace(".txt", "");
            // Full IDs are 6+ chars, suffixes are shorter
            return suffix.length >= 6 ? suffix : distinctId + suffix;
          }
          return textValue;
        };

        // Helper function to parse audio fileset ID from data.json
        const parseAudioFilesetId = (audioValue, distinctId) => {
          if (!audioValue) return null;
          if (audioValue.endsWith(".mp3")) {
            const suffix = audioValue.replace(".mp3", "");
            // Full IDs are 10+ chars, suffixes are shorter
            return suffix.length >= 10 ? suffix : distinctId + suffix;
          }
          return audioValue;
        };

        for (const testament of testaments) {
          if (!manifest.files?.[testament]) continue;

          const allCategories = Object.keys(manifest.files[testament]);

          const testamentData = {
            category: null,
            distinctId: null,
            filesetId: null,
            basePath: null,
            audioFilesetId: null,
            audioCategory: null,
            audioDistinctId: null, // NEW: For timing file lookup when different from distinctId
          };

          // =======================================================
          // PHASE 1: Find a unified distinctId with BOTH text AND audio (with timecode)
          // =======================================================
          // Only check "with-timecode" - syncable doesn't have timecode so can't be used as unified source
          const unifiedPriorityOrder = ["with-timecode"];
          let foundUnified = false;

          for (const category of unifiedPriorityOrder) {
            if (foundUnified) break;
            if (!allCategories.includes(category)) continue;

            const langList = manifest.files[testament][category];
            if (!langList || !langList[langCode]) continue;

            // Get all distinctIds for this language/category
            const distinctIds = langList[langCode];
            const distinctIdArray = Array.isArray(distinctIds)
              ? distinctIds
              : [distinctIds];

            // Check each distinctId for both text AND audio
            for (const distinctId of distinctIdArray) {
              try {
                const dataPath = `/ALL-langs-data/${testament}/${category}/${langCode}/${distinctId}/data.json`;
                const dataResponse = await fetch(dataPath);

                if (dataResponse.ok) {
                  const filesetData = await dataResponse.json();

                  const filesetId = parseTextFilesetId(
                    filesetData.t,
                    distinctId,
                  );
                  const audioFilesetId = parseAudioFilesetId(
                    filesetData.a,
                    distinctId,
                  );

                  // Check if this distinctId has BOTH text AND audio
                  if (filesetId && audioFilesetId) {
                    testamentData.category = category;
                    testamentData.distinctId = distinctId;
                    testamentData.filesetId = filesetId;
                    testamentData.audioFilesetId = audioFilesetId;
                    testamentData.audioCategory = category;
                    // audioDistinctId not needed - same as distinctId
                    foundUnified = true;
                    break;
                  }
                }
              } catch (err) {
                continue;
              }
            }
          }

          // =======================================================
          // PHASE 2: Fallback - load text and audio from separate sources
          // =======================================================
          if (!foundUnified) {
            // Phase 2a: Find text fileset
            const textPriorityOrder = [
              "with-timecode",
              "syncable",
              "text-only",
            ];

            for (const category of textPriorityOrder) {
              if (testamentData.filesetId) break;
              if (!allCategories.includes(category)) continue;

              const langList = manifest.files[testament][category];
              if (!langList || !langList[langCode]) continue;

              const distinctIds = langList[langCode];
              const distinctIdArray = Array.isArray(distinctIds)
                ? distinctIds
                : [distinctIds];

              for (const distinctId of distinctIdArray) {
                try {
                  const dataPath = `/ALL-langs-data/${testament}/${category}/${langCode}/${distinctId}/data.json`;
                  const dataResponse = await fetch(dataPath);

                  if (dataResponse.ok) {
                    const filesetData = await dataResponse.json();
                    const filesetId = parseTextFilesetId(
                      filesetData.t,
                      distinctId,
                    );

                    if (filesetId) {
                      testamentData.category = category;
                      testamentData.distinctId = distinctId;
                      testamentData.filesetId = filesetId;
                      break;
                    }
                  }
                } catch (err) {
                  continue;
                }
              }
            }

            // Phase 2b: Find audio fileset (separate from text)
            const audioPriorityOrder = [
              "with-timecode",
              "audio-with-timecode",
              "syncable",
              "text-only",
              "audio-only",
            ];

            for (const category of audioPriorityOrder) {
              if (testamentData.audioFilesetId) break;
              if (!allCategories.includes(category)) continue;

              const langList = manifest.files[testament][category];
              if (!langList || !langList[langCode]) continue;

              const distinctIds = langList[langCode];
              const distinctIdArray = Array.isArray(distinctIds)
                ? distinctIds
                : [distinctIds];

              for (const distinctId of distinctIdArray) {
                try {
                  const dataPath = `/ALL-langs-data/${testament}/${category}/${langCode}/${distinctId}/data.json`;
                  const dataResponse = await fetch(dataPath);

                  if (dataResponse.ok) {
                    const filesetData = await dataResponse.json();
                    const audioFilesetId = parseAudioFilesetId(
                      filesetData.a,
                      distinctId,
                    );

                    if (audioFilesetId) {
                      testamentData.audioFilesetId = audioFilesetId;
                      testamentData.audioCategory = category;
                      // Store audioDistinctId for timing lookup (different from text distinctId)
                      testamentData.audioDistinctId = distinctId;
                      break;
                    }
                  }
                } catch (err) {
                  continue;
                }
              }
            }
          }

          // Store testament data if we found either text or audio
          if (testamentData.filesetId || testamentData.audioFilesetId) {
            langData[testament] = testamentData;
          }
        }

        // Attach direct-audio config if available for this language
        await attachDirectAudioConfig(langCode, langData);

        if (Object.keys(langData).length > 0) {
          const newLanguageData = {
            ...languageDataRef.current,
            [langCode]: langData,
          };
          languageDataRef.current = newLanguageData;
          updateState({
            languageData: newLanguageData,
          });
        }

        return null;
      } catch (error) {
        console.error(
          `[loadLanguageData] Error loading ${langCode} from manifest:`,
          error,
        );

        // Fallback to auto-probe for eng/fra if manifest fails
        if (langCode === "eng" || langCode === "fra") {
          const langData = {};
          const candidates =
            langCode === "eng"
              ? ENGLISH_FILESET_CANDIDATES
              : FRENCH_FILESET_CANDIDATES;

          for (const testament of ["ot", "nt"]) {
            const testamentCandidates = candidates[testament];
            if (!testamentCandidates || testamentCandidates.length === 0) {
              continue;
            }
            const probeResult = await probeFilesets(
              testamentCandidates,
              testament,
            );

            if (probeResult && probeResult.success) {
              langData[testament] = {
                category: "api-probed",
                distinctId: probeResult.filesetId,
                filesetId: probeResult.filesetId,
                needsET: probeResult.needsET,
                basePath: null,
              };
            }
          }

          if (Object.keys(langData).length > 0) {
            const newLanguageData = {
              ...languageDataRef.current,
              [langCode]: langData,
            };
            languageDataRef.current = newLanguageData;
            updateState({
              languageData: newLanguageData,
            });
          }
        }

        return null;
      }
    },
    [state.languageData, probeFilesets],
  );

  // Load a specific chapter text using DBT API proxy (or BSB for English)
  const loadChapter = useCallback(
    async (bookId, chapterNum, testament = "ot", language = null) => {
      // Use provided language or fall back to primary language
      const langCode = language || selectedLanguageRef.current;

      if (!langCode) {
        return null;
      }

      // Language-specific cache key
      const chapterKey = `${langCode}-${bookId}.${chapterNum}`;

      // Check if already loading using ref (check this first!)
      if (loadingChaptersRef.current[chapterKey]) {
        return null;
      }

      // Check if already cached using ref (real-time value)
      if (chapterTextRef.current[chapterKey]) {
        return chapterTextRef.current[chapterKey];
      }

      // Early check: For non-English languages, verify text is available before loading
      if (langCode !== "eng") {
        const languageData = languageDataRef.current;

        // Load language data if not already loaded
        if (!languageData[langCode]) {
          await loadLanguageData(langCode);
        }

        const langData = languageData[langCode]?.[testament];

        // Silent return if no text data available (neither direct nor DBT)
        if (!langData || (!langData.filesetId && !langData.directText)) {
          return null;
        }
      }

      // Mark as loading
      loadingChaptersRef.current[chapterKey] = true;
      updateState({ isLoadingChapter: true });

      try {
        let result = null;

        // For English, use BSB data instead of DBT API
        if (langCode === "eng") {
          const bsbData = await loadBSBChapter(bookId, chapterNum);
          if (bsbData) {
            result = bsbData; // BSB format: { isBSB: true, book, chapter, verses }
          }
        }

        // Try direct text files (no proxy needed)
        if (!result) {
          const languageData = languageDataRef.current;
          const langData = languageData[langCode]?.[testament];

          if (langData?.directText) {
            try {
              const textResp = await fetch(
                `/direct-audio/${langCode}/text/${bookId}_${chapterNum}.txt`,
              );
              if (textResp.ok) {
                const text = await textResp.text();
                const lines = text.trim().split("\n");
                result = lines.map((line, i) => ({
                  num: i + 1,
                  text: line.trim(),
                }));
              }
            } catch (e) {
              // Fall through to DBT
            }
          }
        }

        // Fall back to DBT API
        if (!result) {
          const languageData = languageDataRef.current;
          const langData = languageData[langCode]?.[testament];
          const filesetId = langData?.filesetId;

          if (filesetId) {
            const url = `/.netlify/functions/dbt-proxy?type=text&fileset_id=${filesetId}&book_id=${bookId}&chapter_id=${chapterNum}`;
            const response = await fetch(url, {
              priority: "low",
            });

            if (!response.ok) {
              throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();

            if (data.data && Array.isArray(data.data)) {
              result = data.data.map((verse) => ({
                num: parseInt(verse.verse_start, 10),
                text: verse.verse_text,
              }));
            }
          }
        }

        // Update state with loaded chapter - immutably
        delete loadingChaptersRef.current[chapterKey];

        const newChapterText = {
          ...chapterTextRef.current,
          [chapterKey]: result,
        };
        chapterTextRef.current = newChapterText;

        updateState({
          chapterText: newChapterText,
          isLoadingChapter: false,
        });

        return result;
      } catch (error) {
        console.warn(`Failed to load chapter ${chapterKey}:`, error.message);
        delete loadingChaptersRef.current[chapterKey];

        setState((prevState) => ({
          ...prevState,
          isLoadingChapter: false,
        }));
        return null;
      }
    },
    [state, loadLanguageData],
  );

  // Scan markdown files to build story testament metadata
  // Optimized: fetches in parallel batches and updates state progressively
  // Only fetches files that exist in manifest.json to avoid 404 errors
  const preloadBibleReferences = useCallback(async (storySetId = "OBS") => {
    // Prevent duplicate preload for the same storySetId
    if (preloadStartedRef.current.has(storySetId)) {
      return;
    }
    preloadStartedRef.current.add(storySetId);

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

    try {
      // First, load manifest.json to get list of files that actually exist
      const manifestResponse = await fetch(
        `/templates/${storySetId}/manifest.json`,
      );
      if (!manifestResponse.ok) {
        throw new Error(`Could not load ${storySetId} manifest`);
      }
      const manifest = await manifestResponse.json();

      // Build set of existing markdown files (lowercase for case-insensitive matching)
      const existingFiles = new Set(
        manifest.files
          .map((f) => f.path)
          .filter((p) => p.endsWith(".md"))
          .map((p) => p.toLowerCase()),
      );

      // Get list of all categories from main index
      const indexResponse = await fetch(`/templates/${storySetId}/index.toml`);
      if (!indexResponse.ok) {
        throw new Error(`Could not load ${storySetId} index`);
      }
      const indexText = await indexResponse.text();
      const indexData = parseToml(indexText);
      const categories = indexData.categories || [];

      // Collect all story paths from all categories (fetch category indexes in parallel)
      const categoryPromises = categories.map(async (cat) => {
        const categoryDir = typeof cat === "string" ? cat : cat.id;
        try {
          const catResponse = await fetch(
            `/templates/${storySetId}/${categoryDir}/index.toml`,
          );
          if (catResponse.ok) {
            const catText = await catResponse.text();
            const catData = parseToml(catText);
            if (catData.stories) {
              return catData.stories.map((story) => {
                const id = typeof story === "string" ? story : story.id;
                return { path: `${categoryDir}/${id}.md`, storyId: id };
              });
            }
          }
        } catch (err) {
          // Ignore errors for individual categories
        }
        return [];
      });

      const storyArrays = await Promise.all(categoryPromises);
      const allStories = storyArrays.flat();

      // Filter to only stories that exist in manifest
      const existingStories = allStories.filter((story) =>
        existingFiles.has(story.path.toLowerCase()),
      );

      // Fetch only markdown files that exist (to avoid 404 errors)
      const storyPromises = existingStories.map(async ({ path, storyId }) => {
        try {
          const mdResponse = await fetch(`/templates/${storySetId}/${path}`);
          if (mdResponse.ok) {
            const content = await mdResponse.text();
            const testamentsUsed = { ot: false, nt: false };

            // Extract all references and determine testaments
            const refMatches = content.matchAll(/\[\[ref:\s*([^\]]+)\]\]/g);
            for (const match of refMatches) {
              const ref = match[1].trim();
              const bookMatch = ref.match(/^([A-Z0-9]+)\s+/i);
              if (bookMatch) {
                const book = bookMatch[1].toUpperCase();
                if (ntBooks.includes(book)) {
                  testamentsUsed.nt = true;
                } else {
                  testamentsUsed.ot = true;
                }
              }
            }

            return {
              storyId,
              testaments: {
                usesOT: testamentsUsed.ot,
                usesNT: testamentsUsed.nt,
              },
            };
          }
        } catch (err) {
          // Ignore errors for individual stories
        }
        return { storyId, testaments: { usesOT: false, usesNT: false } };
      });

      const storyResults = await Promise.all(storyPromises);

      // Build metadata object
      const newStoryMetadata = {};
      for (const { storyId, testaments } of storyResults) {
        newStoryMetadata[storyId] = {
          testaments,
          title: null,
          cachedAt: Date.now(),
        };
      }

      // Update state with all story metadata at once
      setState((prevState) => ({
        ...prevState,
        storyMetadata: {
          ...prevState.storyMetadata,
          ...newStoryMetadata,
        },
      }));
    } catch (error) {
      console.error("Error scanning story testament metadata:", error);
      preloadStartedRef.current.delete(storySetId); // Reset on error so it can retry
    }
  }, []);

  // Load audio URL for a specific chapter (cache only what's requested)
  const loadAudioUrl = useCallback(
    async (
      bookId,
      chapterNum,
      testament = "ot",
      forLanguage = null,
      storySetId = "OBS",
    ) => {
      // Use provided language or fall back to selected language
      const targetLanguage = forLanguage || state.selectedLanguage;
      if (!targetLanguage) {
        return null;
      }

      const audioKey = `${targetLanguage}-${testament}-${bookId}.${chapterNum}`;

      // Check if already cached using ref (real-time value)
      if (audioUrlsRef.current[audioKey]) {
        return audioUrlsRef.current[audioKey];
      }

      // Check if already loading
      if (loadingAudioRef.current[audioKey]) {
        return null;
      }

      // Get language data
      const languageData = languageDataRef.current;

      // Load language data if not already loaded
      if (!languageData[targetLanguage]) {
        await loadLanguageData(targetLanguage);
      }

      const langData = languageData[targetLanguage]?.[testament];
      if (!langData) {
        return null;
      }

      // Check if this language/testament has audio (direct or DBT)
      if (!langData.directAudio && !langData.audioFilesetId) {
        return null; // No audio available for this testament
      }

      // Mark as loading
      loadingAudioRef.current[audioKey] = true;
      updateState({ isLoadingAudio: true });

      try {
        let audioUrl = null;
        let hasTimecode = false;
        let timingData = null;
        let audioFilesetId = null;
        let usedDirectAudio = false;

        // Try direct audio first (no proxy needed)
        if (langData.directAudio) {
          audioUrl = buildDirectAudioUrl(
            langData.directAudio,
            bookId,
            chapterNum,
          );
          if (audioUrl) {
            usedDirectAudio = true;
            // Check for direct timecodes
            const manifest = directAudioManifestRef.current;
            if (manifest?.[targetLanguage]?.timecodes) {
              hasTimecode = true;
              try {
                const tcResp = await fetch(
                  `/direct-audio/${targetLanguage}/timecodes/${bookId}_${chapterNum}.csv`,
                );
                if (tcResp.ok) {
                  const csvText = await tcResp.text();
                  // Parse CSV: each line is the END time of that verse
                  // Verse 1 starts at 0, verse 2 starts at line 1's value, etc.
                  const endTimes = csvText
                    .trim()
                    .split("\n")
                    .map((line) => parseFloat(line.trim()))
                    .filter((v) => !isNaN(v));
                  const verseTimestamps = {};
                  endTimes.forEach((ts, i) => {
                    // Verse i+1 starts at previous verse's end (or 0 for first)
                    verseTimestamps[String(i + 1)] =
                      i === 0 ? 0 : endTimes[i - 1];
                  });
                  // Add final boundary (end of last verse)
                  verseTimestamps[String(endTimes.length + 1)] =
                    endTimes[endTimes.length - 1];
                  // Wrap in structure compatible with existing timingData usage
                  // timingData is keyed by "BOOK CHAPTER"
                  timingData = {
                    [`${bookId} ${chapterNum}`]: { verseTimestamps },
                  };
                }
              } catch (e) {
                // Continue without timecodes
              }
            }
          }
        }

        // Fall back to DBT proxy if direct audio not available
        if (!audioUrl && langData.audioFilesetId) {
          audioFilesetId = langData.audioFilesetId;

          const url = `/.netlify/functions/dbt-proxy?type=audio&fileset_id=${audioFilesetId}&book_id=${bookId}&chapter_id=${chapterNum}`;
          const response = await fetch(url);

          if (!response.ok) {
            throw new Error(`Audio API request failed: ${response.status}`);
          }

          const data = await response.json();

          if (data.data && Array.isArray(data.data) && data.data.length > 0) {
            audioUrl = data.data[0].path;
          }

          if (!audioUrl) {
            throw new Error("No audio URL in response");
          }
        }

        if (!audioUrl) {
          throw new Error("No audio URL available");
        }

        // Check if this category has timecode data
        if (!hasTimecode) {
          if (
            ["with-timecode", "audio-with-timecode"].includes(
              langData.audioCategory,
            )
          ) {
            hasTimecode = true;
          }
          // Also consider direct timecodes available via CSV files
          if (!hasTimecode && langData.directTimecodes) {
            hasTimecode = true;
          }
        }

        // Load DBT-based timing data (skip if we already have timing from direct CSV)
        if (hasTimecode && !timingData) {
          const timingCacheKey = `${storySetId}-${targetLanguage}-${testament}`;

          // Check if timing file is already cached
          if (timingFileCacheRef.current[timingCacheKey]) {
            timingData = timingFileCacheRef.current[timingCacheKey];
          } else {
            // Load timing manifest to check if timing file exists before fetching
            const timingManifest = await loadTimingManifest(storySetId);

            // Load and cache the whole timing file
            try {
              const audioCategory = langData.audioCategory;
              // Use audioDistinctId if available (Phase 2 case), else distinctId (Phase 1 case)
              const distinctId =
                langData.audioDistinctId ||
                langData.distinctId ||
                targetLanguage;
              const langCode = targetLanguage;

              // Try timing file with audio category first, then fallback to with-timecode
              const timingCategoriesToTry = [audioCategory];
              if (audioCategory === "audio-with-timecode") {
                timingCategoriesToTry.push("with-timecode");
              }

              for (const timingCategory of timingCategoriesToTry) {
                // Check manifest first to see if this timing file exists
                if (timingManifest) {
                  const categoryData =
                    timingManifest.files?.[testament]?.[timingCategory];
                  if (!categoryData) {
                    continue; // Category doesn't exist in manifest
                  }

                  const distinctIdsForLang = categoryData[langCode];
                  if (!distinctIdsForLang) {
                    continue; // Language not available in this category
                  }

                  // Check if distinctId is in the array
                  const distinctIdExists = Array.isArray(distinctIdsForLang)
                    ? distinctIdsForLang.includes(distinctId)
                    : false;

                  if (!distinctIdExists) {
                    continue; // This specific distinctId doesn't have timing data
                  }
                }

                const timingPath = `/templates/${storySetId}/ALL-timings/${testament}/${timingCategory}/${langCode}/${distinctId}/timing.json`;

                try {
                  const timecodeResponse = await fetch(timingPath);

                  if (timecodeResponse.ok) {
                    timingData = await timecodeResponse.json();

                    // Cache the whole timing file for current language only
                    timingFileCacheRef.current = {
                      [timingCacheKey]: timingData,
                    };
                    updateState({
                      timingFileCache: { [timingCacheKey]: timingData },
                    });
                    break; // Found timing data, stop trying
                  }
                } catch (err) {
                  // Continue to next category
                }
              }
            } catch (timecodeError) {
              // Continue without timing data
            }
          }
        }

        // Fallback: if DBT timing data doesn't cover this chapter, try direct CSV timecodes
        if (hasTimecode && langData.directTimecodes) {
          // Check if DBT timing data actually has data for this chapter
          let dbtHasChapter = false;
          if (timingData && audioFilesetId && timingData[audioFilesetId]) {
            const filesetData = timingData[audioFilesetId];
            const searchPrefix = `${bookId}${chapterNum}:`;
            for (const storyData of Object.values(filesetData)) {
              if (
                Object.keys(storyData).some((ref) =>
                  ref.startsWith(searchPrefix),
                )
              ) {
                dbtHasChapter = true;
                break;
              }
            }
          }

          if (!dbtHasChapter) {
            try {
              const tcResp = await fetch(
                `/direct-audio/${targetLanguage}/timecodes/${bookId}_${chapterNum}.csv`,
              );
              if (tcResp.ok) {
                const csvText = await tcResp.text();
                const endTimes = csvText
                  .trim()
                  .split("\n")
                  .map((line) => parseFloat(line.trim()))
                  .filter((v) => !isNaN(v));
                const verseTimestamps = {};
                endTimes.forEach((ts, i) => {
                  verseTimestamps[String(i + 1)] =
                    i === 0 ? 0 : endTimes[i - 1];
                });
                verseTimestamps[String(endTimes.length + 1)] =
                  endTimes[endTimes.length - 1];
                timingData = {
                  [`${bookId} ${chapterNum}`]: { verseTimestamps },
                };
              }
            } catch (e) {
              // Continue without timecodes
            }
          }
        }

        // Create cache entry object with reference string for future cross-chapter support
        const cacheEntry = {
          reference: `${bookId} ${chapterNum}`, // e.g., "MAT 1"
          url: audioUrl,
          hasTimecode: hasTimecode,
          timingData: timingData,
          audioFilesetId: audioFilesetId,
        };

        // Update cache
        delete loadingAudioRef.current[audioKey];

        setState((prevState) => ({
          ...prevState,
          audioUrls: {
            ...prevState.audioUrls,
            [audioKey]: cacheEntry,
          },
          isLoadingAudio: false,
        }));

        // Update ref immediately
        audioUrlsRef.current[audioKey] = cacheEntry;

        return cacheEntry;
      } catch (error) {
        console.error(`Failed to load audio URL for ${audioKey}:`, error);
        delete loadingAudioRef.current[audioKey];

        setState((prevState) => ({
          ...prevState,
          isLoadingAudio: false,
        }));
        return null;
      }
    },
    [state, loadLanguageData, buildDirectAudioUrl],
  );

  // Load chapters on-demand for a specific story
  const loadChaptersForStory = useCallback(
    async (references, languages) => {
      if (!references || references.length === 0) {
        return;
      }

      const chaptersToLoad = new Map(); // Use Map with string keys for proper deduplication

      // Parse all references to extract unique chapters
      references.forEach((ref) => {
        const parsed = parseReference(ref);
        if (parsed) {
          const { book, chapter } = parsed;
          const testament = getTestament(book);

          // Add for each selected language (only if language has data for this testament)
          languages.forEach((langCode) => {
            // Skip if language doesn't have data for this testament
            const langData = state.languageData[langCode];
            if (langData && !langData[testament]) {
              // Language exists but doesn't have this testament - skip silently
              return;
            }

            const chapterKey = `${langCode}-${book}.${chapter}`;
            if (!chaptersToLoad.has(chapterKey)) {
              chaptersToLoad.set(chapterKey, {
                langCode,
                book,
                chapter,
                testament,
              });
            }
          });
        }
      });

      // Load each chapter if not already cached
      for (const [
        chapterKey,
        { langCode, book, chapter, testament },
      ] of chaptersToLoad) {
        // Skip if already cached or currently loading
        if (
          chapterTextRef.current[chapterKey] ||
          loadingChaptersRef.current[chapterKey]
        ) {
          continue;
        }

        // Load the chapter
        await loadChapter(book, parseInt(chapter, 10), testament, langCode);

        // Small delay to avoid overwhelming the server
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    },
    [loadChapter, state.languageData],
  );

  // Clean up cached data for a deselected language
  const cleanupLanguageData = useCallback((langCode) => {
    const newChapterText = {};
    const newAudioUrls = {};
    const newTimingFileCache = {};

    // Keep all data except for the deselected language
    Object.keys(chapterTextRef.current).forEach((key) => {
      if (!key.startsWith(`${langCode}-`)) {
        newChapterText[key] = chapterTextRef.current[key];
      }
    });

    Object.keys(audioUrlsRef.current).forEach((key) => {
      if (!key.startsWith(`${langCode}-`)) {
        newAudioUrls[key] = audioUrlsRef.current[key];
      }
    });

    Object.keys(timingFileCacheRef.current).forEach((key) => {
      if (!key.startsWith(`${langCode}-`)) {
        newTimingFileCache[key] = timingFileCacheRef.current[key];
      }
    });

    chapterTextRef.current = newChapterText;
    audioUrlsRef.current = newAudioUrls;
    timingFileCacheRef.current = newTimingFileCache;

    updateState({
      chapterText: newChapterText,
      audioUrls: newAudioUrls,
      timingFileCache: newTimingFileCache,
    });

    console.log(`Cleaned up cached data for ${langCode.toUpperCase()}`);
  }, []);

  // Set selected languages (primary and secondary) and load their data
  const setSelectedLanguages = useCallback(
    async (primaryLangCode, secondaryLangCode = null) => {
      // Compute old and new active languages
      const oldActiveLanguages = selectedLanguagesRef.current;
      const newActive = getActiveLanguages(primaryLangCode, secondaryLangCode);

      // Find languages that were deselected
      const deselectedLanguages = oldActiveLanguages.filter(
        (lang) => !newActive.languages.includes(lang),
      );

      // Clean up deselected languages
      deselectedLanguages.forEach((langCode) => {
        cleanupLanguageData(langCode);
      });

      // Clear timing file cache when languages change
      timingFileCacheRef.current = {};
      selectedLanguageRef.current = primaryLangCode;
      secondaryLanguageRef.current = secondaryLangCode;
      selectedLanguagesRef.current = newActive.languages;

      updateState({
        selectedLanguage: primaryLangCode,
        secondaryLanguage: secondaryLangCode,
        selectedLanguages: newActive.languages,
        engIsExplicit: newActive.engIsExplicit,
        timingFileCache: {},
      });

      // Load language data for all active languages
      for (const langCode of newActiveLanguages) {
        if (!languageDataRef.current[langCode]) {
          await loadLanguageData(langCode);
        }
      }

      // Log language info
      console.log(
        `Languages updated: ${newActiveLanguages.join(", ").toUpperCase()}`,
      );
      if (deselectedLanguages.length > 0) {
        console.log(
          `Cleaned up: ${deselectedLanguages.join(", ").toUpperCase()}`,
        );
      }
    },
    [loadLanguageData, cleanupLanguageData],
  );

  // Set selected language and load its data (backward compatibility)
  const setSelectedLanguage = useCallback(
    async (langCode) => {
      await setSelectedLanguages(langCode, secondaryLanguageRef.current);
    },
    [setSelectedLanguages],
  );

  // Get available books for selected language
  const getAvailableBooks = useCallback(
    (testament = null) => {
      const { selectedLanguage, languageData } = state;

      if (!selectedLanguage || !languageData[selectedLanguage]) {
        return [];
      }

      const books = [];
      const langData = languageData[selectedLanguage];

      if (testament === "ot" || testament === null) {
        if (langData.ot) {
          books.push({
            testament: "ot",
            filesetId: langData.ot.filesetId || langData.ot.distinctId,
            category: langData.ot.category,
          });
        }
      }

      if (testament === "nt" || testament === null) {
        if (langData.nt) {
          books.push({
            testament: "nt",
            filesetId: langData.nt.filesetId || langData.nt.distinctId,
            category: langData.nt.category,
          });
        }
      }

      return books;
    },
    [state],
  );

  // Initialize on mount - load summary and language data
  useEffect(() => {
    // Prevent multiple initializations (React StrictMode calls effects twice)
    if (initializationStartedRef.current) {
      return;
    }
    initializationStartedRef.current = true;

    const init = async () => {
      try {
        await loadSummary();

        // Load language data for ALL active languages
        const activeLanguages = selectedLanguagesRef.current;
        for (const langCode of activeLanguages) {
          await loadLanguageData(langCode);
        }

        // Log initial language info after data is loaded
        console.log(
          `Initialized with languages: ${activeLanguages.join(", ").toUpperCase()}`,
        );

        for (const langCode of activeLanguages) {
          const langData = languageDataRef.current[langCode];
          if (langData) {
            const otTextCat = langData.ot?.category || "N/A";
            const otAudioCat = langData.ot?.audioCategory || "N/A";
            const otDirect = langData.ot?.directAudio ? "direct" : "";
            const ntTextCat = langData.nt?.category || "N/A";
            const ntAudioCat = langData.nt?.audioCategory || "N/A";
            const ntDirect = langData.nt?.directAudio ? "direct" : "";

            console.log(
              `  ${langCode.toUpperCase()} - OT: text(${otTextCat})/audio(${otAudioCat})${otDirect ? `/${otDirect}` : ""}, NT: text(${ntTextCat})/audio(${ntAudioCat})${ntDirect ? `/${ntDirect}` : ""}`,
            );
          }
        }
      } catch (error) {
        console.error("Initialization error:", error);
        // Initialization failed
        initializationStartedRef.current = false; // Reset on error
      }
    };
    init();
  }, []);

  // Sync external language prop changes with state
  useEffect(() => {
    const needsUpdate =
      initialLanguage !== state.selectedLanguage ||
      initialSecondaryLanguage !== state.secondaryLanguage;

    if (needsUpdate) {
      // Recompute active languages
      const newActive = getActiveLanguages(
        initialLanguage,
        initialSecondaryLanguage,
      );

      // Update refs
      selectedLanguageRef.current = initialLanguage;
      secondaryLanguageRef.current = initialSecondaryLanguage;
      selectedLanguagesRef.current = newActive.languages;

      // Clear caches when languages change (immutably)
      const newChapterText = {};
      const newAudioUrls = {};
      const newTimingFileCache = {};
      chapterTextRef.current = newChapterText;
      audioUrlsRef.current = newAudioUrls;
      loadingChaptersRef.current = {};
      loadingAudioRef.current = {};
      timingFileCacheRef.current = newTimingFileCache;
      preloadStartedRef.current = new Set(); // Reset preload flag to allow reloading

      // Load language data for ALL active languages
      const loadPromises = newActive.languages.map((langCode) => {
        if (!languageDataRef.current[langCode]) {
          return loadLanguageData(langCode);
        }
        return Promise.resolve();
      });

      Promise.all(loadPromises).then(() => {
        // Update state AFTER all languages are loaded
        updateState({
          selectedLanguage: initialLanguage,
          secondaryLanguage: initialSecondaryLanguage,
          selectedLanguages: newActive.languages,
          engIsExplicit: newActive.engIsExplicit,
          languageData: { ...languageDataRef.current },
          chapterText: newChapterText,
          audioUrls: newAudioUrls,
          timingFileCache: newTimingFileCache,
        });

        // Log language info with details
        console.log(
          `Languages changed to: ${newActive.languages.join(", ").toUpperCase()}`,
        );
        for (const langCode of newActive.languages) {
          const langData = languageDataRef.current[langCode];
          if (langData) {
            const otTextCat = langData.ot?.category || "N/A";
            const otAudioCat = langData.ot?.audioCategory || "N/A";
            const ntTextCat = langData.nt?.category || "N/A";
            const ntAudioCat = langData.nt?.audioCategory || "N/A";

            console.log(
              `  ${langCode.toUpperCase()} - OT: text(${otTextCat})/audio(${otAudioCat}), NT: text(${ntTextCat})/audio(${ntAudioCat})`,
            );
          } else {
            console.log(
              `  ${langCode.toUpperCase()} - No language data loaded`,
            );
          }
        }
      });
    }
  }, [initialLanguage, initialSecondaryLanguage, loadLanguageData]);

  // Helper to get current chapter text from ref (for immediate access after loading)
  const getChapterTextSnapshot = useCallback(() => {
    return chapterTextRef.current;
  }, []);

  const value = {
    ...state,
    loadSummary,
    loadLanguageData,
    loadChapter,
    loadAudioUrl,
    setSelectedLanguage,
    setSelectedLanguages,
    cleanupLanguageData,
    loadChaptersForStory,
    getAvailableBooks,
    probeFileset,
    probeFilesets,
    getStoryMetadata,
    getChapterTextSnapshot,
    preloadBibleReferences,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export { LanguageContext, LanguageProvider };
export default LanguageContext;
