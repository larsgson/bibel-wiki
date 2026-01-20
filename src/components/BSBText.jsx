import React, { useEffect, useState } from "react";
import { getLexiconEntries } from "../helpers/strongsApi";
import { getCrossReferences } from "../helpers/bsbDataApi";
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
      // Apply RTL class when Hebrew order is enabled
      const wordsClassName = `bsb-interlinear-words ${useHebrewOrder ? "bsb-interlinear-words-rtl" : ""}`;

      // Get cross-references for full mode
      const verseKey = bsbData.book
        ? `${bsbData.book}.${bsbData.chapter}.${verse.v}`
        : null;
      const crossRefs =
        !isCompact && verseKey ? crossRefsCache[verseKey] || [] : [];
      const displayCrossRefs = crossRefs.slice(0, 3);
      const moreCrossRefs = crossRefs.length > 3 ? crossRefs.length - 3 : 0;

      return (
        <div key={verseIndex} className="bsb-verse-interlinear">
          <span className="bsb-verse-number">{verse.v}</span>
          <div className={wordsClassName}>
            {verse.w.map(([text, strongs], wordIndex) =>
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
