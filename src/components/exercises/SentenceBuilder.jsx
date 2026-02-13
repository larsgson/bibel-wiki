import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { shuffleArray } from "../../utils/exerciseUtils";
import useTranslation from "../../hooks/useTranslation";
import "./SentenceBuilder.css";

function SentenceBuilder({ primaryWords, secondaryText, isRTL, layoutTheme }) {
  const { t } = useTranslation();
  const [placedIds, setPlacedIds] = useState([]);
  const [checked, setChecked] = useState(false);
  const [checkedResult, setCheckedResult] = useState(null);
  const [hintVisible, setHintVisible] = useState(false);
  const hintTimerRef = useRef(null);

  const clearHintTimer = useCallback(() => {
    if (hintTimerRef.current) {
      clearTimeout(hintTimerRef.current);
      hintTimerRef.current = null;
    }
  }, []);

  const toggleHint = useCallback(() => {
    clearHintTimer();
    if (hintVisible) {
      setHintVisible(false);
    } else {
      setHintVisible(true);
      hintTimerRef.current = setTimeout(() => {
        setHintVisible(false);
      }, 3000);
    }
  }, [hintVisible, clearHintTimer]);

  useEffect(() => {
    return clearHintTimer;
  }, [clearHintTimer]);

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
    // Algorithm with re-sync:
    // Two pointers: userIdx (user's placed words), expectedPos (correct order 0,1,2,...).
    // handled: IDs already consumed from user's list (shown as wrong or correct).
    // wrongIds: IDs shown as RED (wrong) — when expectedPos matches one of these,
    //           show it as GREY (displaced) to indicate where it actually belongs.
    //
    // For each expectedPos:
    //   1. If expectedPos is in wrongIds → GREY (displaced, shows correct position)
    //   2. Skip user words in handled
    //   3. If user's word == expectedPos → GREEN (correct)
    //   4. Else check if expectedPos exists later in user's unhandled words:
    //      - Found → user's current word is wrong → RED + expectedPos → GREY (displaced)
    //      - Not found → expectedPos missing → RED (missing)
    //
    // Statuses: "correct" (green), "wrong" (red), "missing" (red), "displaced" (grey)
    const result = [];
    let userIdx = 0;
    let expectedPos = 0;
    const handled = new Set();
    const wrongIds = new Set();

    while (expectedPos < primaryWords.length) {
      // If this position's word was already shown as RED wrong elsewhere,
      // check if user's next word happens to be the expected one → GREEN
      // otherwise show as GREY (where it actually belongs)
      if (wrongIds.has(expectedPos)) {
        // Peek at next unconsumed user word
        let peekIdx = userIdx;
        while (peekIdx < placedIds.length && handled.has(placedIds[peekIdx])) {
          peekIdx++;
        }
        if (peekIdx < placedIds.length && placedIds[peekIdx] === expectedPos) {
          // User has the right word next — GREEN, consume it
          result.push({
            id: expectedPos,
            word: primaryWords[expectedPos],
            status: "correct",
          });
          handled.add(expectedPos);
          userIdx = peekIdx + 1;
        } else {
          result.push({
            id: expectedPos,
            word: primaryWords[expectedPos],
            status: "displaced",
          });
        }
        expectedPos++;
        continue;
      }

      // Skip user words already handled
      while (userIdx < placedIds.length && handled.has(placedIds[userIdx])) {
        userIdx++;
      }

      if (userIdx >= placedIds.length) {
        // No more user words — rest are missing
        result.push({
          id: expectedPos,
          word: primaryWords[expectedPos],
          status: "missing",
        });
        expectedPos++;
        continue;
      }

      const userId = placedIds[userIdx];

      if (userId === expectedPos) {
        // Correct position
        result.push({
          id: expectedPos,
          word: primaryWords[expectedPos],
          status: "correct",
        });
        handled.add(expectedPos);
        userIdx++;
        expectedPos++;
      } else {
        // Mismatch — check if expectedPos exists later in user's unhandled words
        let foundLater = false;
        for (let j = userIdx + 1; j < placedIds.length; j++) {
          if (!handled.has(placedIds[j]) && placedIds[j] === expectedPos) {
            foundLater = true;
            break;
          }
        }
        if (foundLater) {
          // User's word is in wrong spot → RED
          result.push({
            id: userId,
            word: primaryWords[userId],
            status: "wrong",
          });
          handled.add(userId);
          wrongIds.add(userId);
          userIdx++;
          // Check if user's next unconsumed word is the expected one → GREEN
          let peekIdx = userIdx;
          while (
            peekIdx < placedIds.length &&
            handled.has(placedIds[peekIdx])
          ) {
            peekIdx++;
          }
          if (
            peekIdx < placedIds.length &&
            placedIds[peekIdx] === expectedPos
          ) {
            result.push({
              id: expectedPos,
              word: primaryWords[expectedPos],
              status: "correct",
            });
            handled.add(expectedPos);
            userIdx = peekIdx + 1;
          } else {
            // Expected word shown as GREY (displaced — user put it somewhere else)
            result.push({
              id: expectedPos,
              word: primaryWords[expectedPos],
              status: "displaced",
            });
          }
        } else {
          // Expected word truly missing → RED (auto-inserted)
          result.push({
            id: expectedPos,
            word: primaryWords[expectedPos],
            status: "missing",
          });
        }
        expectedPos++;
      }
    }

    // Remaining unhandled user words
    for (let i = userIdx; i < placedIds.length; i++) {
      if (!handled.has(placedIds[i])) {
        result.push({
          id: placedIds[i],
          word: primaryWords[placedIds[i]],
          status: "wrong",
        });
      }
    }

    setCheckedResult(result);
    setChecked(true);
  }, [placedIds, primaryWords]);

  const handleReset = useCallback(() => {
    setPlacedIds([]);
    setChecked(false);
    setCheckedResult(null);
  }, []);

  const remainingTiles = tiles.filter((tile) => !placedIds.includes(tile.id));
  const allPlaced = placedIds.length === primaryWords.length;
  const allCorrect =
    checked &&
    checkedResult &&
    checkedResult.every((r) => r.status === "correct");

  return (
    <div
      className={`sentence-builder${layoutTheme ? ` theme-${layoutTheme}` : ""}`}
    >
      <div className="sentence-builder-hint-wrapper">
        <p className="sentence-builder-instruction">
          {t("learnExercises.buildSentence") || "Build the sentence"}
          {secondaryText && (
            <button
              className="sentence-builder-hint-btn"
              onClick={toggleHint}
              aria-label="Show hint"
            >
              ?
            </button>
          )}
        </p>

        {/* Translation hint (brief popup, auto-fades after 3s) */}
        {secondaryText && hintVisible && (
          <div className="sentence-builder-hint-overlay" onClick={toggleHint}>
            <p className="sentence-builder-hint-text">{secondaryText}</p>
          </div>
        )}
      </div>

      {/* Answer row */}
      <div className="sentence-builder-answer" dir={isRTL ? "rtl" : undefined}>
        {!checked && placedIds.length === 0 && (
          <span className="sentence-builder-placeholder">...</span>
        )}
        {!checked &&
          placedIds.map((id) => (
            <button
              key={id}
              className="word-tile placed"
              onClick={() => removeWord(id)}
            >
              {primaryWords[id]}
            </button>
          ))}
        {checked &&
          checkedResult &&
          checkedResult.map((entry, i) => (
            <span
              key={`${i}-${entry.id}`}
              className={`word-tile placed${
                entry.status === "correct"
                  ? " word-correct"
                  : entry.status === "displaced"
                    ? " word-displaced"
                    : " word-wrong"
              }`}
            >
              {entry.word}
            </span>
          ))}
      </div>

      {/* Word bank */}
      {!checked && (
        <div className="sentence-builder-bank" dir={isRTL ? "rtl" : undefined}>
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
      )}

      {/* Actions */}
      <div className="sentence-builder-actions">
        {allPlaced && !checked && (
          <button className="sentence-builder-check-btn" onClick={handleCheck}>
            {t("learnExercises.check") || "Check"}
          </button>
        )}
        {allCorrect && (
          <div className="sentence-builder-feedback correct">
            {t("learnExercises.completed") || "Well done!"}
          </div>
        )}
        {checked && !allCorrect && (
          <button className="sentence-builder-reset-btn" onClick={handleReset}>
            ↻
          </button>
        )}
      </div>
    </div>
  );
}

export default SentenceBuilder;
