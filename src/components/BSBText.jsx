import React, { useEffect, useState } from "react";
import { getLexiconEntries } from "../helpers/strongsApi";
import { getCrossReferences } from "../helpers/bsbDataApi";
import "./BSBText.css";

/**
 * BSBText component - renders BSB verse data with clickable words
 * Supports 4 display modes: eng (plain text), strongs, interlinear-compact, interlinear-full
 *
 * New data format (2024):
 * - verse.w = English words array [[text, strongs], ...]
 * - verse.heb = Hebrew words array (OT only) - already in Hebrew word order
 * - verse.grk = Greek words array (NT only) - already in Greek word order
 */
function BSBText({
  bsbData,
  displayMode = "eng",
  useHebrewOrder = false,
  onWordClick,
  onCrossRefClick,
  className = "",
}) {
  const [lexiconCache, setLexiconCache] = useState({});
  const [crossRefsCache, setCrossRefsCache] = useState({});

  // Load lexicon entries for interlinear modes
  useEffect(() => {
    const isInterlinear =
      displayMode === "interlinear-compact" ||
      displayMode === "interlinear-full";

    if (!isInterlinear || !bsbData?.verses) return;

    // Collect all Strong's numbers from verses
    const strongsNumbers = new Set();
    bsbData.verses.forEach((verse) => {
      verse.w.forEach(([, strongs]) => {
        if (strongs) strongsNumbers.add(strongs.toUpperCase());
      });
    });

    // Load entries not already cached
    const numbersToLoad = Array.from(strongsNumbers).filter(
      (num) => !lexiconCache[num],
    );

    if (numbersToLoad.length > 0) {
      getLexiconEntries(numbersToLoad).then((entries) => {
        setLexiconCache((prev) => ({ ...prev, ...entries }));
      });
    }
  }, [bsbData, displayMode]);

  // Load cross-references for full interlinear mode
  useEffect(() => {
    if (
      displayMode !== "interlinear-full" ||
      !bsbData?.verses ||
      !bsbData.book
    ) {
      return;
    }

    // Load cross-refs for each verse
    const loadCrossRefs = async () => {
      const newCrossRefs = {};
      for (const verse of bsbData.verses) {
        const verseKey = `${bsbData.book}.${bsbData.chapter}.${verse.v}`;
        if (!crossRefsCache[verseKey]) {
          const refs = await getCrossReferences(
            bsbData.book,
            bsbData.chapter,
            verse.v,
          );
          newCrossRefs[verseKey] = refs;
        }
      }
      if (Object.keys(newCrossRefs).length > 0) {
        setCrossRefsCache((prev) => ({ ...prev, ...newCrossRefs }));
      }
    };

    loadCrossRefs();
  }, [bsbData, displayMode]);

  if (!bsbData || !bsbData.verses || bsbData.verses.length === 0) {
    return null;
  }

  /**
   * Check if text is just punctuation or whitespace
   */
  const isPunctuation = (text) => {
    return /^[\s.,;:!?'"()\[\]\-—–׃׀]+$/.test(text);
  };

  /**
   * Check if text should be skipped (untranslated markers)
   */
  const shouldSkipWord = (text, strongs) => {
    if (!strongs) return false;
    // Skip dashes, ellipses, and placeholder markers that have Strong's numbers
    return /^[-–—]+$|^\.+\s*\.+\s*\.+$|^vvv$/.test(text.trim());
  };

  /**
   * Clean text by removing brackets but keeping content
   */
  const cleanText = (text) => {
    return text.replace(/[\[\]{}]/g, "");
  };

  /**
   * Handle word click
   */
  const handleWordClick = (e, strongs) => {
    e.stopPropagation();
    if (onWordClick && strongs) {
      onWordClick(strongs);
    }
  };

  /**
   * Check if Strong's number is Hebrew (OT)
   */
  const isHebrew = (strongs) => {
    return strongs && strongs.toUpperCase().startsWith("H");
  };

  /**
   * Check if verse data contains Hebrew content (based on Strong's numbers or heb array)
   */
  const verseIsHebrew = (verse) => {
    // First check if verse has Hebrew data array
    if (verse.heb) return true;
    if (verse.grk) return false;
    // Fallback: check first word with a Strong's number
    if (!verse.w) return false;
    for (const [, strongs] of verse.w) {
      if (strongs) {
        return isHebrew(strongs);
      }
    }
    return false;
  };

  /**
   * Check if verse data contains Greek content
   */
  const verseIsGreek = (verse) => {
    return !!verse.grk;
  };

  /**
   * Render word in ENG mode (plain text with clickable words)
   */
  const renderEngWord = (text, strongs, index) => {
    if (shouldSkipWord(text, strongs)) {
      return null;
    }

    if (!strongs || isPunctuation(text)) {
      return <span key={index}>{text}</span>;
    }

    const displayText = cleanText(text);
    return (
      <span
        key={index}
        className="bsb-clickable-word"
        onClick={(e) => handleWordClick(e, strongs)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleWordClick(e, strongs);
          }
        }}
        title={strongs}
      >
        {displayText}
      </span>
    );
  };

  /**
   * Render word in Strong's mode (text with inline Strong's badge)
   */
  const renderStrongsWord = (text, strongs, index) => {
    if (shouldSkipWord(text, strongs)) {
      return null;
    }

    if (!strongs || isPunctuation(text)) {
      return <span key={index}>{text}</span>;
    }

    const displayText = cleanText(text);
    return (
      <span
        key={index}
        className="bsb-strongs-word"
        onClick={(e) => handleWordClick(e, strongs)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleWordClick(e, strongs);
          }
        }}
      >
        <span className="bsb-strongs-text">{displayText}</span>
        <span className="bsb-strongs-badge">{strongs}</span>
      </span>
    );
  };

  /**
   * Render interlinear word card
   * @param {string} originalText - Original language word (Hebrew/Greek)
   * @param {string} englishText - English translation
   * @param {string} strongs - Strong's number
   * @param {string} index - Unique key
   * @param {boolean} isCompact - Compact mode flag
   * @param {boolean} isHebrewWord - Whether this is a Hebrew word
   */
  const renderInterlinearCard = (
    originalText,
    englishText,
    strongs,
    index,
    isCompact,
    isHebrewWord,
  ) => {
    if (!strongs) return null;

    const displayEnglish = cleanText(englishText);

    return (
      <button
        key={index}
        className={`bsb-interlinear-card ${isCompact ? "bsb-interlinear-card-compact" : ""}`}
        onClick={(e) => handleWordClick(e, strongs)}
      >
        {!isCompact && (
          <span className="bsb-interlinear-strongs">{strongs}</span>
        )}
        {originalText && (
          <span
            className={`bsb-interlinear-original ${isHebrewWord ? "bsb-interlinear-hebrew" : "bsb-interlinear-greek"}`}
          >
            {originalText}
          </span>
        )}
        <span className="bsb-interlinear-english">{displayEnglish}</span>
      </button>
    );
  };

  /**
   * Build interlinear word pairs by matching Strong's numbers
   * between English and original language arrays
   */
  const buildInterlinearPairs = (verse, useOriginalOrder) => {
    const isVerseHebrew = verseIsHebrew(verse);
    const originalLangKey = isVerseHebrew ? "heb" : "grk";
    const originalWords = verse[originalLangKey] || [];

    // Build a map of Strong's -> original word for lookup
    const strongsToOriginal = new Map();
    originalWords.forEach(([text, strongs]) => {
      if (strongs && !isPunctuation(text)) {
        // If same Strong's appears multiple times, store as array
        if (strongsToOriginal.has(strongs)) {
          const existing = strongsToOriginal.get(strongs);
          if (Array.isArray(existing)) {
            existing.push(text);
          } else {
            strongsToOriginal.set(strongs, [existing, text]);
          }
        } else {
          strongsToOriginal.set(strongs, text);
        }
      }
    });

    // Track which original words we've used (for duplicates)
    const usedOriginalIndices = new Map();

    if (useOriginalOrder && originalWords.length > 0) {
      // Use original language word order (Hebrew/Greek)
      // Build pairs based on original word array order
      const pairs = [];
      const usedEnglishIndices = new Set();

      originalWords.forEach(([origText, origStrongs], origIdx) => {
        if (!origStrongs || isPunctuation(origText)) return;

        // Find matching English word
        let englishText = "";
        for (let i = 0; i < verse.w.length; i++) {
          const [engText, engStrongs] = verse.w[i];
          if (engStrongs === origStrongs && !usedEnglishIndices.has(i)) {
            englishText = engText;
            usedEnglishIndices.add(i);
            break;
          }
        }

        pairs.push({
          original: origText,
          english: englishText || "",
          strongs: origStrongs,
          index: origIdx,
          isHebrew: isVerseHebrew,
        });
      });

      return pairs;
    } else {
      // Use English word order
      const pairs = [];

      verse.w.forEach(([engText, engStrongs], engIdx) => {
        if (!engStrongs || isPunctuation(engText)) return;
        if (shouldSkipWord(engText, engStrongs)) return;

        // Get original word from map
        let originalText = "";
        const origValue = strongsToOriginal.get(engStrongs);
        if (origValue) {
          if (Array.isArray(origValue)) {
            // Multiple originals with same Strong's - use next unused one
            const usedCount = usedOriginalIndices.get(engStrongs) || 0;
            originalText = origValue[usedCount] || origValue[0];
            usedOriginalIndices.set(engStrongs, usedCount + 1);
          } else {
            originalText = origValue;
          }
        }

        pairs.push({
          original: originalText,
          english: engText,
          strongs: engStrongs,
          index: engIdx,
          isHebrew: isVerseHebrew,
        });
      });

      return pairs;
    }
  };

  /**
   * Render a single verse based on display mode
   */
  const renderVerse = (verse, verseIndex) => {
    const isInterlinear =
      displayMode === "interlinear-compact" ||
      displayMode === "interlinear-full";
    const isCompact = displayMode === "interlinear-compact";

    if (isInterlinear) {
      // Check if verse contains Hebrew content
      const isVerseHebrew = verseIsHebrew(verse);
      const shouldUseOriginalOrder =
        useHebrewOrder && (isVerseHebrew || verseIsGreek(verse));

      // Get cross-references for full mode
      const verseKey = bsbData.book
        ? `${bsbData.book}.${bsbData.chapter}.${verse.v}`
        : null;
      const crossRefs =
        !isCompact && verseKey ? crossRefsCache[verseKey] || [] : [];
      const displayCrossRefs = crossRefs.slice(0, 3);
      const moreCrossRefs = crossRefs.length > 3 ? crossRefs.length - 3 : 0;

      // Build interlinear word pairs
      const wordPairs = buildInterlinearPairs(verse, shouldUseOriginalOrder);

      // Apply RTL class when using Hebrew order
      const wordsClassName = `bsb-interlinear-words ${shouldUseOriginalOrder && isVerseHebrew ? "bsb-interlinear-words-rtl" : ""}`;

      return (
        <div key={verseIndex} className="bsb-verse-interlinear">
          <span className="bsb-verse-number">{verse.v}</span>
          <div className="bsb-interlinear-content">
            <div className={wordsClassName}>
              {wordPairs.map((pair) =>
                renderInterlinearCard(
                  pair.original,
                  pair.english,
                  pair.strongs,
                  `${verseIndex}-${pair.index}`,
                  isCompact,
                  pair.isHebrew,
                ),
              )}
            </div>
            {/* Cross-references in full mode */}
            {!isCompact && displayCrossRefs.length > 0 && (
              <div className="bsb-cross-refs">
                {displayCrossRefs.map((ref, idx) => (
                  <button
                    key={idx}
                    className="bsb-cross-ref-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onCrossRefClick) {
                        // Parse reference like "MAT.1.5" to { book, chapter, verse }
                        const match = ref.match(/^([A-Z0-9]+)\.(\d+)\.(\d+)$/);
                        if (match) {
                          onCrossRefClick(
                            match[1],
                            parseInt(match[2]),
                            parseInt(match[3]),
                          );
                        }
                      }
                    }}
                  >
                    {ref.replace(/\./g, " ").replace(/(\d+) (\d+)$/, "$1:$2")}
                  </button>
                ))}
                {moreCrossRefs > 0 && (
                  <span className="bsb-cross-ref-more">+{moreCrossRefs}</span>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (displayMode === "strongs") {
      return (
        <span key={verseIndex} className="bsb-verse bsb-verse-strongs">
          {verse.w.map(([text, strongs], wordIndex) =>
            renderStrongsWord(text, strongs, `${verseIndex}-${wordIndex}`),
          )}
        </span>
      );
    }

    // Default: ENG mode
    return (
      <span key={verseIndex} className="bsb-verse">
        {verse.w.map(([text, strongs], wordIndex) =>
          renderEngWord(text, strongs, `${verseIndex}-${wordIndex}`),
        )}
      </span>
    );
  };

  const isInterlinear =
    displayMode === "interlinear-compact" || displayMode === "interlinear-full";

  return (
    <div
      className={`bsb-text ${isInterlinear ? "bsb-text-interlinear" : ""} ${className}`}
    >
      {bsbData.verses.map((verse, index) => renderVerse(verse, index))}
    </div>
  );
}

export default BSBText;
