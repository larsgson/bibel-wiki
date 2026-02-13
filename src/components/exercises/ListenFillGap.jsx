import { useState, useEffect, useCallback, useMemo } from "react";
import { pickGapWords, shuffleArray } from "../../utils/exerciseUtils";
import useTranslation from "../../hooks/useTranslation";
import "./ListenFillGap.css";

function ListenFillGap({ primaryWords, playVerse, layoutTheme }) {
  const { t } = useTranslation();
  const [filledGaps, setFilledGaps] = useState({});
  const [checked, setChecked] = useState(false);

  // Pick gap positions and build word bank
  const { gapIndices, bankWords } = useMemo(() => {
    const gaps = pickGapWords(primaryWords, 2);
    // Correct answers + a few decoys from same verse
    const correctWords = gaps.map((i) => primaryWords[i]);
    const otherWords = primaryWords
      .filter((_, i) => !gaps.includes(i))
      .filter((w) => w.replace(/[.,;:!?'"()]/g, "").length > 2);
    const decoys = shuffleArray(otherWords).slice(0, 2);
    const bank = shuffleArray([...correctWords, ...decoys]);
    return { gapIndices: gaps, bankWords: bank };
  }, [primaryWords]);

  // Auto-play audio
  useEffect(() => {
    const timer = setTimeout(() => {
      playVerse();
    }, 300);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBankClick = useCallback(
    (word) => {
      // Find the first unfilled gap
      const nextGap = gapIndices.find((gi) => !filledGaps[gi]);
      if (nextGap === undefined) return;
      setFilledGaps((prev) => ({ ...prev, [nextGap]: word }));
      setChecked(false);
    },
    [gapIndices, filledGaps],
  );

  const handleGapClick = useCallback((gapIndex) => {
    setFilledGaps((prev) => {
      const next = { ...prev };
      delete next[gapIndex];
      return next;
    });
    setChecked(false);
  }, []);

  const handleCheck = useCallback(() => {
    setChecked(true);
  }, []);

  const handleReset = useCallback(() => {
    setFilledGaps({});
    setChecked(false);
  }, []);

  const allFilled = gapIndices.every((gi) => filledGaps[gi]);
  const allCorrect =
    checked &&
    gapIndices.every((gi) => filledGaps[gi] === primaryWords[gi]);

  // Words already placed in gaps (used to hide from bank)
  const usedWords = Object.values(filledGaps);

  return (
    <div className={`listen-fill-gap${layoutTheme ? ` theme-${layoutTheme}` : ""}`}>
      <p className="listen-fill-instruction">
        {t("learnExercises.fillBlanks") || "Fill in the blanks"}
      </p>

      {/* Verse with gaps */}
      <div className="listen-fill-verse">
        {primaryWords.map((word, i) => {
          if (gapIndices.includes(i)) {
            const filled = filledGaps[i];
            const isWrong = checked && filled && filled !== primaryWords[i];
            const isRight = checked && filled && filled === primaryWords[i];
            return (
              <span
                key={i}
                className={`listen-fill-blank${filled ? " filled" : ""}${isRight ? " correct" : ""}${isWrong ? " incorrect" : ""}`}
                onClick={() => filled && handleGapClick(i)}
              >
                {filled || "____"}
              </span>
            );
          }
          return (
            <span key={i} className="listen-fill-word">
              {word}
            </span>
          );
        })}
      </div>

      {/* Word bank */}
      <div className="listen-fill-bank">
        {bankWords.map((word, i) => {
          const isUsed = usedWords.includes(word);
          return (
            <button
              key={`${word}-${i}`}
              className={`word-tile${isUsed ? " used" : ""}`}
              onClick={() => !isUsed && handleBankClick(word)}
              disabled={isUsed}
            >
              {word}
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="listen-fill-actions">
        {allFilled && !checked && (
          <button className="listen-fill-check-btn" onClick={handleCheck}>
            {t("learnExercises.check") || "Check"}
          </button>
        )}
        {checked && allCorrect && (
          <div className="listen-fill-feedback correct">
            {t("learnExercises.completed") || "Well done!"}
          </div>
        )}
        {checked && !allCorrect && (
          <div className="listen-fill-feedback-row">
            <div className="listen-fill-feedback incorrect">
              {t("learnExercises.incorrect") || "Try again"}
            </div>
            <button className="listen-fill-reset-btn" onClick={handleReset}>
              ↻
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ListenFillGap;
