import React, { useEffect, useState } from "react";
import { getLexiconEntries } from "../helpers/strongsApi";
import { getCrossReferences, getVerseIndex } from "../helpers/bsbDataApi";
import "./BSBText.css";

/**
 * BSBText component - renders BSB verse data with clickable words
 * Supports 4 display modes: eng (plain text), strongs, interlinear-compact, interlinear-full
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
  const [morphOrderCache, setMorphOrderCache] = useState({});

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

  // Load morphology order data for Hebrew word ordering in interlinear modes
  useEffect(() => {
    const isInterlinear =
      displayMode === "interlinear-compact" ||
      displayMode === "interlinear-full";

    if (
      !isInterlinear ||
      !useHebrewOrder ||
      !bsbData?.verses ||
      !bsbData.book
    ) {
      return;
    }

    // Load morph order for each verse (to get Hebrew word order)
    const loadMorphOrder = async () => {
      const newMorphOrder = {};
      for (const verse of bsbData.verses) {
        const verseKey = `${bsbData.book}.${bsbData.chapter}.${verse.v}`;
        if (!morphOrderCache[verseKey]) {
          const indexEntry = await getVerseIndex(
            bsbData.book,
            bsbData.chapter,
            verse.v,
          );
          if (indexEntry?.m) {
            // Extract Strong's number order from morphology data
            newMorphOrder[verseKey] = indexEntry.m.map((m) => m.s);
          }
        }
      }
      if (Object.keys(newMorphOrder).length > 0) {
        setMorphOrderCache((prev) => ({ ...prev, ...newMorphOrder }));
      }
    };

    loadMorphOrder();
  }, [bsbData, displayMode, useHebrewOrder]);

  if (!bsbData || !bsbData.verses || bsbData.verses.length === 0) {
    return null;
  }

  /**
   * Check if text is just punctuation or whitespace
   */
  const isPunctuation = (text) => {
    return /^[\s.,;:!?'"()\[\]\-—–]+$/.test(text);
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
   * Get original Hebrew/Greek word from lexicon cache
   */
  const getOriginalWord = (strongs) => {
    if (!strongs) return null;
    const entry = lexiconCache[strongs.toUpperCase()];
    return entry?.word || null;
  };

  /**
   * Check if Strong's number is Hebrew (OT)
   */
  const isHebrew = (strongs) => {
    return strongs && strongs.toUpperCase().startsWith("H");
  };

  /**
   * Check if verse data contains Hebrew content (based on Strong's numbers)
   */
  const verseIsHebrew = (verse) => {
    if (!verse || !verse.w) return false;
    // Check first word with a Strong's number
    for (const [, strongs] of verse.w) {
      if (strongs) {
        return isHebrew(strongs);
      }
    }
    return false;
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
   * Render word in Interlinear mode (card with original word, Strong's number, and English)
   */
  const renderInterlinearWord = (text, strongs, index, isCompact) => {
    if (shouldSkipWord(text, strongs)) {
      return null;
    }

    // Skip punctuation and whitespace in interlinear mode
    if (!strongs || isPunctuation(text)) {
      return null;
    }

    const displayText = cleanText(text);
    const originalWord = getOriginalWord(strongs);
    const isHebrewWord = isHebrew(strongs);

    return (
      <button
        key={index}
        className={`bsb-interlinear-card ${isCompact ? "bsb-interlinear-card-compact" : ""}`}
        onClick={(e) => handleWordClick(e, strongs)}
      >
        {!isCompact && (
          <span className="bsb-interlinear-strongs">{strongs}</span>
        )}
        {originalWord && (
          <span
            className={`bsb-interlinear-original ${isHebrewWord ? "bsb-interlinear-hebrew" : "bsb-interlinear-greek"}`}
          >
            {originalWord}
          </span>
        )}
        <span className="bsb-interlinear-english">{displayText}</span>
      </button>
    );
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
      const shouldUseHebrewOrder = useHebrewOrder && isVerseHebrew;

      // Get cross-references for full mode
      const verseKey = bsbData.book
        ? `${bsbData.book}.${bsbData.chapter}.${verse.v}`
        : null;
      const crossRefs =
        !isCompact && verseKey ? crossRefsCache[verseKey] || [] : [];
      const displayCrossRefs = crossRefs.slice(0, 3);
      const moreCrossRefs = crossRefs.length > 3 ? crossRefs.length - 3 : 0;

      // Get morphology order for Hebrew word sorting
      const morphOrder = verseKey ? morphOrderCache[verseKey] : null;

      // Build word list, filtering out punctuation/whitespace
      const wordTiles = verse.w
        .map(([text, strongs], wordIndex) => ({ text, strongs, wordIndex }))
        .filter(
          ({ strongs, text }) =>
            strongs && !/^[\s.,;:!?'"()\[\]\-—]+$/.test(text),
        );

      // Sort by Hebrew word order if enabled and morph data available
      let orderedWords = wordTiles;

      if (shouldUseHebrewOrder && morphOrder && morphOrder.length > 0) {
        orderedWords = wordTiles.slice().sort((a, b) => {
          // Get original positions in morphOrder
          const aOrigIdx = morphOrder.indexOf(a.strongs);
          const bOrigIdx = morphOrder.indexOf(b.strongs);

          // If not found, keep original order relative to each other
          if (aOrigIdx === -1 && bOrigIdx === -1)
            return a.wordIndex - b.wordIndex;
          if (aOrigIdx === -1) return 1; // a goes after
          if (bOrigIdx === -1) return -1; // b goes after

          return aOrigIdx - bOrigIdx;
        });
      }

      // Apply RTL class when Hebrew order is enabled AND verse contains Hebrew content
      const wordsClassName = `bsb-interlinear-words ${shouldUseHebrewOrder ? "bsb-interlinear-words-rtl" : ""}`;

      return (
        <div key={verseIndex} className="bsb-verse-interlinear">
          <span className="bsb-verse-number">{verse.v}</span>
          <div className={wordsClassName}>
            {orderedWords.map(({ text, strongs, wordIndex }) =>
              renderInterlinearWord(
                text,
                strongs,
                `${verseIndex}-${wordIndex}`,
                isCompact,
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
