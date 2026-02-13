import { useState, useCallback } from "react";
import useTranslation from "../../hooks/useTranslation";
import "./ListenReveal.css";

function ListenReveal({
  primaryText,
  primaryWords,
  playVerse,
  isPlaying,
  isRTL,
  layoutTheme,
}) {
  const { t } = useTranslation();
  const [revealedCount, setRevealedCount] = useState(0);
  const [revealMode, setRevealMode] = useState("word"); // "word" | "all"

  const handleReveal = useCallback(() => {
    if (revealMode === "all") {
      setRevealedCount(primaryWords.length);
    } else {
      setRevealedCount((prev) => Math.min(prev + 1, primaryWords.length));
    }
  }, [revealMode, primaryWords.length]);

  const allRevealed = revealedCount >= primaryWords.length;

  return (
    <div
      className={`listen-reveal${layoutTheme ? ` theme-${layoutTheme}` : ""}`}
    >
      {/* Word display */}
      <div className="listen-reveal-words" dir={isRTL ? "rtl" : undefined}>
        {primaryWords.map((word, i) => (
          <span
            key={i}
            className={`listen-reveal-word${i < revealedCount ? " revealed" : " hidden"}`}
          >
            {i < revealedCount
              ? word
              : "\u00A0".repeat(Math.max(word.length, 3))}
          </span>
        ))}
      </div>

      {/* Controls */}
      <div className="listen-reveal-actions">
        {!allRevealed && (
          <button className="listen-reveal-btn" onClick={handleReveal}>
            {revealMode === "all"
              ? t("learnExercises.revealAll") || "Reveal all"
              : t("learnExercises.tapToReveal") || "Tap to reveal"}
          </button>
        )}
        {allRevealed && (
          <div className="listen-reveal-done">
            {t("learnExercises.completed") || "Well done!"}
          </div>
        )}
      </div>

      {/* Mode toggle */}
      <div className="listen-reveal-mode">
        <button
          className={`listen-reveal-mode-btn${revealMode === "word" ? " active" : ""}`}
          onClick={() => setRevealMode("word")}
        >
          {t("learnExercises.wordByWord") || "Word by word"}
        </button>
        <button
          className={`listen-reveal-mode-btn${revealMode === "all" ? " active" : ""}`}
          onClick={() => setRevealMode("all")}
        >
          {t("learnExercises.revealAll") || "Reveal all"}
        </button>
      </div>
    </div>
  );
}

export default ListenReveal;
