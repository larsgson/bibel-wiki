import { useState, useEffect, useCallback, useMemo } from "react";
import { shuffleArray } from "../../utils/exerciseUtils";
import useTranslation from "../../hooks/useTranslation";
import "./ListenOrder.css";

function ListenOrder({ primaryWords, playVerse, layoutTheme }) {
  const { t } = useTranslation();
  const [placedIds, setPlacedIds] = useState([]);
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // Create shuffled word tiles with stable IDs
  const tiles = useMemo(() => {
    const indexed = primaryWords.map((word, i) => ({ id: i, text: word }));
    return shuffleArray(indexed);
  }, [primaryWords]);

  // Auto-play audio
  useEffect(() => {
    const timer = setTimeout(() => {
      playVerse();
    }, 300);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    <div className={`listen-order${layoutTheme ? ` theme-${layoutTheme}` : ""}`}>
      <p className="listen-order-instruction">
        {t("learnExercises.orderWords") || "Put the words in order"}
      </p>

      {/* Answer row */}
      <div className={`listen-order-answer${checked ? (isCorrect ? " correct" : " incorrect") : ""}`}>
        {placedIds.length === 0 && (
          <span className="listen-order-placeholder-text">...</span>
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
      <div className="listen-order-bank">
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
      <div className="listen-order-actions">
        {allPlaced && !checked && (
          <button className="listen-order-check-btn" onClick={handleCheck}>
            {t("learnExercises.check") || "Check"}
          </button>
        )}
        {checked && isCorrect && (
          <div className="listen-order-feedback correct">
            {t("learnExercises.completed") || "Well done!"}
          </div>
        )}
        {checked && !isCorrect && (
          <div className="listen-order-feedback-row">
            <div className="listen-order-feedback incorrect">
              {t("learnExercises.incorrect") || "Try again"}
            </div>
            <button className="listen-order-reset-btn" onClick={handleReset}>
              ↻
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ListenOrder;
