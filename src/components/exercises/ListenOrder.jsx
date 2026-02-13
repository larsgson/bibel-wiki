import { useState, useCallback, useMemo } from "react";
import { shuffleArray } from "../../utils/exerciseUtils";
import useTranslation from "../../hooks/useTranslation";
import "./ListenOrder.css";

function ListenOrder({ primaryWords, playVerse, isRTL, layoutTheme }) {
  const { t } = useTranslation();
  // Pre-place the first half of words; user orders the rest
  const prefillCount = Math.floor(primaryWords.length / 2);

  const [placedIds, setPlacedIds] = useState(() =>
    Array.from({ length: prefillCount }, (_, i) => i),
  );
  const [hasError, setHasError] = useState(false);

  // Shuffle only the remaining (second half) word tiles
  const tiles = useMemo(() => {
    const remaining = primaryWords
      .map((word, i) => ({ id: i, text: word }))
      .filter((_, i) => i >= prefillCount);
    return shuffleArray(remaining);
  }, [primaryWords, prefillCount]);

  const placeWord = useCallback((id) => {
    setPlacedIds((prev) => {
      const next = [...prev, id];
      // Check if the newly placed word is in the correct position
      const expectedId = next.length - 1;
      if (id !== expectedId) {
        setHasError(true);
      }
      return next;
    });
  }, []);

  const removeLastWord = useCallback(() => {
    setPlacedIds((prev) => prev.slice(0, -1));
    setHasError(false);
  }, []);

  const remainingTiles = tiles.filter((tile) => !placedIds.includes(tile.id));
  const allCorrect = !hasError && placedIds.length === primaryWords.length;

  return (
    <div
      className={`listen-order${layoutTheme ? ` theme-${layoutTheme}` : ""}`}
    >
      <p className="listen-order-instruction">
        {t("learnExercises.orderWords") || "Put the words in order"}
      </p>

      {/* Answer row */}
      <div className="listen-order-answer" dir={isRTL ? "rtl" : undefined}>
        {placedIds.length === 0 && (
          <span className="listen-order-placeholder-text">...</span>
        )}
        {placedIds.map((id, position) => {
          const word = primaryWords[id];
          const isPrefilled = id < prefillCount;
          const isUserPlaced = !isPrefilled;
          const isCorrectPos = id === position;
          const isWrong = isUserPlaced && !isCorrectPos;
          return (
            <span
              key={`${position}-${id}`}
              className={`word-tile placed${isPrefilled ? " prefilled" : ""}${isUserPlaced && isCorrectPos ? " word-correct" : ""}${isWrong ? " word-wrong" : ""}`}
              onClick={isWrong ? removeLastWord : undefined}
              style={isWrong ? { cursor: "pointer" } : undefined}
            >
              {word}
            </span>
          );
        })}
      </div>

      {/* Word bank */}
      <div
        className={`listen-order-bank${hasError ? " disabled" : ""}`}
        dir={isRTL ? "rtl" : undefined}
      >
        {remainingTiles.map((tile) => (
          <button
            key={tile.id}
            className="word-tile"
            onClick={() => !hasError && placeWord(tile.id)}
            disabled={hasError}
          >
            {tile.text}
          </button>
        ))}
      </div>

      {/* Feedback */}
      {allCorrect && (
        <div className="listen-order-actions">
          <div className="listen-order-feedback correct">
            {t("learnExercises.completed") || "Well done!"}
          </div>
        </div>
      )}
    </div>
  );
}

export default ListenOrder;
