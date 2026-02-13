import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  getAllExercises,
  getTabExercises,
  getOverflowExercises,
} from "./ExerciseRegistry";
import useTranslation from "../../hooks/useTranslation";
import "./ExerciseTabBar.css";

const ICONS = {
  "ear-reveal": (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 12c0-4 3-7 6-7s6 3 6 7" />
      <path d="M18 12c0 3-1.5 5-3 6.5S12 21 12 21" />
      <circle cx="12" cy="14" r="1.5" fill="currentColor" stroke="none" />
      <path d="M1 12s4-6 8-6" opacity="0.5" />
    </svg>
  ),
  "ear-check": (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 12c0-4 3-7 6-7s6 3 6 7" />
      <path d="M18 12c0 3-1.5 5-3 6.5S12 21 12 21" />
      <path d="M8 13l2.5 2.5L16 10" strokeWidth="2" />
    </svg>
  ),
  "ear-sort": (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 12c0-4 3-7 6-7s6 3 6 7" />
      <path d="M18 12c0 3-1.5 5-3 6.5S12 21 12 21" />
      <path d="M8 14h8M9 17h6M10 11h4" opacity="0.7" />
    </svg>
  ),
  "ear-blank": (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 12c0-4 3-7 6-7s6 3 6 7" />
      <path d="M18 12c0 3-1.5 5-3 6.5S12 21 12 21" />
      <path d="M8 15h3M13 15h3" strokeWidth="2.5" opacity="0.6" />
    </svg>
  ),
  puzzle: (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 7h3a2 2 0 0 0 0-4h0a2 2 0 0 0 0 4h3v3a2 2 0 0 1 4 0v0a2 2 0 0 1-4 0v3H7a2 2 0 0 0 0 4h0a2 2 0 0 0 0-4H4V7z" />
      <path d="M14 14h3a2 2 0 0 1 0 4h0a2 2 0 0 1 0-4h3V7h-3a2 2 0 0 0 0-4h0a2 2 0 0 0 0 4h-3v7z" />
    </svg>
  ),
  more: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  ),
};

function ExerciseTabBar({
  activeExerciseId,
  onSelectExercise,
  layoutTheme,
  variant,
}) {
  const { t } = useTranslation();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);

  const isDesktop = variant === "desktop";

  // Desktop: show all exercises. Mobile: split into tabs + overflow,
  // but if overflow has only 1 item, show it inline instead of a "more" menu.
  const { visibleExercises, overflowExercises } = useMemo(() => {
    if (isDesktop) {
      return { visibleExercises: getAllExercises(), overflowExercises: [] };
    }
    const tabs = getTabExercises();
    const overflow = getOverflowExercises();
    if (overflow.length <= 1) {
      // Not worth a "more" button for 1 item — show all inline
      return { visibleExercises: getAllExercises(), overflowExercises: [] };
    }
    return { visibleExercises: tabs, overflowExercises: overflow };
  }, [isDesktop]);

  const handleSelect = useCallback(
    (id) => {
      onSelectExercise(id);
      setMoreOpen(false);
    },
    [onSelectExercise],
  );

  const toggleMore = useCallback(() => {
    setMoreOpen((prev) => !prev);
  }, []);

  // Close more menu on outside click
  useEffect(() => {
    if (!moreOpen) return;
    const handleClick = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
    };
  }, [moreOpen]);

  const getLabel = (exercise) => {
    const parts = exercise.localeKey.split(".");
    return t(parts[0] + "." + parts[1]) || exercise.id;
  };

  return (
    <nav
      className={`exercise-tab-bar${layoutTheme ? ` theme-${layoutTheme}` : ""}`}
    >
      {visibleExercises.map((exercise) => (
        <button
          key={exercise.id}
          className={`exercise-tab-item${activeExerciseId === exercise.id ? " active" : ""}`}
          onClick={() => handleSelect(exercise.id)}
          aria-label={getLabel(exercise)}
        >
          <span className="exercise-tab-icon">{ICONS[exercise.icon]}</span>
          <span className="exercise-tab-label">{getLabel(exercise)}</span>
        </button>
      ))}

      {overflowExercises.length > 0 && (
        <div className="exercise-tab-more-wrapper" ref={moreRef}>
          <button
            className={`exercise-tab-item${overflowExercises.some((e) => e.id === activeExerciseId) ? " active" : ""}`}
            onClick={toggleMore}
            aria-label={t("learnExercises.more") || "More"}
          >
            <span className="exercise-tab-icon">{ICONS.more}</span>
            <span className="exercise-tab-label">
              {t("learnExercises.more") || "More"}
            </span>
          </button>
          {moreOpen && (
            <div className="exercise-more-menu">
              {overflowExercises.map((exercise) => (
                <button
                  key={exercise.id}
                  className={`exercise-more-item${activeExerciseId === exercise.id ? " active" : ""}`}
                  onClick={() => handleSelect(exercise.id)}
                >
                  <span className="exercise-tab-icon">
                    {ICONS[exercise.icon]}
                  </span>
                  <span>{getLabel(exercise)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

export default ExerciseTabBar;
