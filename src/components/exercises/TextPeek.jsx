import { useState, useEffect, useCallback, useRef } from "react";
import "./TextPeek.css";

function TextPeek({ text, layoutTheme }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleTap = useCallback(() => {
    clearTimer();
    if (visible) {
      setVisible(false);
    } else {
      setVisible(true);
      timerRef.current = setTimeout(() => {
        setVisible(false);
      }, 3000);
    }
  }, [visible, clearTimer]);

  // Clean up timer on unmount or verse change
  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  // Hide when text changes (new verse)
  useEffect(() => {
    setVisible(false);
    clearTimer();
  }, [text, clearTimer]);

  if (!text) return null;

  return (
    <div className="text-peek-wrapper">
      <button
        className={`text-peek-trigger${layoutTheme ? ` theme-${layoutTheme}` : ""}`}
        onClick={handleTap}
        aria-label="Peek at text"
        title="Peek at text"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
      {visible && (
        <div className={`text-peek-overlay${layoutTheme ? ` theme-${layoutTheme}` : ""}`}>
          <p className="text-peek-text">{text}</p>
        </div>
      )}
    </div>
  );
}

export default TextPeek;
