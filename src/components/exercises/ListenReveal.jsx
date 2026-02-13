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
  const [revealedSet, setRevealedSet] = useState(new Set());

  const toggleWord = useCallback((index) => {
    setRevealedSet((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setRevealedSet((prev) => {
      if (prev.size >= primaryWords.length) {
        return new Set();
      }
      return new Set(primaryWords.map((_, i) => i));
    });
  }, [primaryWords]);

  const allRevealed = revealedSet.size >= primaryWords.length;

  return (
    <div
      className={`listen-reveal${layoutTheme ? ` theme-${layoutTheme}` : ""}`}
    >
      {/* Word display */}
      <div className="listen-reveal-words" dir={isRTL ? "rtl" : undefined}>
        {primaryWords.map((word, i) => (
          <span
            key={i}
            className={`listen-reveal-word${revealedSet.has(i) ? " revealed" : " hidden"}`}
            onClick={() => toggleWord(i)}
          >
            {revealedSet.has(i)
              ? word
              : "\u00A0".repeat(Math.max(word.length, 3))}
          </span>
        ))}
      </div>

      {/* Toggle all — eye icon */}
      <div className="listen-reveal-actions">
        <button
          className="listen-reveal-eye-btn"
          onClick={toggleAll}
          aria-label={
            allRevealed
              ? t("learnExercises.hideAll") || "Hide all"
              : t("learnExercises.revealAll") || "Reveal all"
          }
          title={
            allRevealed
              ? t("learnExercises.hideAll") || "Hide all"
              : t("learnExercises.revealAll") || "Reveal all"
          }
        >
          {allRevealed ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

export default ListenReveal;
