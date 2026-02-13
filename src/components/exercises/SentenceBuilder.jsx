import { useState, useCallback, useMemo } from "react";
import { shuffleArray } from "../../utils/exerciseUtils";
import useTranslation from "../../hooks/useTranslation";
import "./SentenceBuilder.css";

function SentenceBuilder({ primaryWords, secondaryText, layoutTheme }) {
  const { t } = useTranslation();
  const [placedIds, setPlacedIds] = useState([]);
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const tiles = useMemo(() => {
    const indexed = primaryWords.map((word, i) => ({ id: i, text: word }));
    return shuffleArray(indexed);
  }, [primaryWords]);

  const placeWord = useCallback((id) => {
    setPlacedIds((prev) => [...prev, id]);
    setChecked(false);
  }, []);

  const removeWord = useCallback((id) => {
    setPlacedIds((prev) => prev.filter((pid) => pid !== id));
    setChecked(false);
  }, []);

  const handleCheck = useCallback(() => {
    const correct = placedIds.every((id, i) => id === i);
    setIsCorrect(correct);
    setChecked(true);
  }, [placedIds]);

  const handleReset = useCallback(() => {
    setPlacedIds([]);
    setChecked(false);
    setIsCorrect(false);
  }, []);

  const remainingTiles = tiles.filter((tile) => !placedIds.includes(tile.id));
  const allPlaced = placedIds.length === primaryWords.length;

  return (
    <div className={`sentence-builder${layoutTheme ? ` theme-${layoutTheme}` : ""}`}>
      {/* Translation prompt */}
      {secondaryText && (
        <div className="sentence-builder-prompt">
          <span className="sentence-builder-prompt-label">
            {t("learnExercises.buildSentence") || "Build the sentence"}:
          </span>
          <p className="sentence-builder-prompt-text">{secondaryText}</p>
        </div>
      )}

      {/* Answer row */}
      <div className={`sentence-builder-answer${checked ? (isCorrect ? " correct" : " incorrect") : ""}`}>
        {placedIds.length === 0 && (
          <span className="sentence-builder-placeholder">...</span>
        )}
        {placedIds.map((id) => {
          const tile = tiles.find((t) => t.id === id);
          return (
            <button
              key={id}
              className="word-tile placed"
              onClick={() => removeWord(id)}
            >
              {tile.text}
            </button>
          );
        })}
      </div>

      {/* Word bank */}
      <div className="sentence-builder-bank">
        {remainingTiles.map((tile) => (
          <button
            key={tile.id}
            className="word-tile"
            onClick={() => placeWord(tile.id)}
          >
            {tile.text}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="sentence-builder-actions">
        {allPlaced && !checked && (
          <button className="sentence-builder-check-btn" onClick={handleCheck}>
            {t("learnExercises.check") || "Check"}
          </button>
        )}
        {checked && isCorrect && (
          <div className="sentence-builder-feedback correct">
            {t("learnExercises.completed") || "Well done!"}
          </div>
        )}
        {checked && !isCorrect && (
          <div className="sentence-builder-feedback-row">
            <div className="sentence-builder-feedback incorrect">
              {t("learnExercises.incorrect") || "Try again"}
            </div>
            <button className="sentence-builder-reset-btn" onClick={handleReset}>
              ↻
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SentenceBuilder;
