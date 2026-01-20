import React, { useEffect, useState } from "react";
import { searchConcordance } from "../helpers/bsbDataApi";
import { getLexiconEntry, getStrongsLanguage } from "../helpers/strongsApi";
import "./ConcordanceScreen.css";

/**
 * ConcordanceScreen - Shows all verses containing a Strong's number
 */
function ConcordanceScreen({ strongsNumber, onBack, onVerseClick }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lexiconEntry, setLexiconEntry] = useState(null);

  useEffect(() => {
    if (!strongsNumber) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Load both concordance results and lexicon entry
    Promise.all([
      searchConcordance(strongsNumber),
      getLexiconEntry(strongsNumber),
    ])
      .then(([concordanceResults, entry]) => {
        setResults(concordanceResults);
        setLexiconEntry(entry);
      })
      .catch((err) => {
        console.error("Error searching concordance:", err);
        setError("Failed to search concordance");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [strongsNumber]);

  const language = strongsNumber ? getStrongsLanguage(strongsNumber) : "";
  const isHebrew = language === "Hebrew";

  /**
   * Truncate text to specified length
   */
  const truncateText = (text, maxLength = 80) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  /**
   * Format reference display
   */
  const formatReference = (bookCode, chapter, verse) => {
    return `${bookCode} ${chapter}:${verse}`;
  };

  return (
    <div className="concordance-screen" onClick={(e) => e.stopPropagation()}>
      {/* Header */}
      <div className="concordance-header">
        <button
          className="concordance-back"
          onClick={(e) => {
            e.stopPropagation();
            onBack();
          }}
        >
          ←
        </button>
        <div className="concordance-title-area">
          <span className="concordance-title">Concordance</span>
          <span
            className={`concordance-word ${isHebrew ? "concordance-word-hebrew" : ""}`}
          >
            {lexiconEntry?.word || strongsNumber}
          </span>
        </div>
        <span
          className={`concordance-badge ${isHebrew ? "concordance-badge-hebrew" : "concordance-badge-greek"}`}
        >
          {strongsNumber}
        </span>
      </div>

      {/* Results count */}
      {!loading && !error && (
        <div className="concordance-count">
          {results.length} verse{results.length !== 1 ? "s" : ""} found
        </div>
      )}

      {/* Content */}
      <div className="concordance-content">
        {loading && (
          <div className="concordance-loading">Searching Bible...</div>
        )}

        {error && <div className="concordance-error">{error}</div>}

        {!loading && !error && results.length === 0 && (
          <div className="concordance-empty">No verses found</div>
        )}

        {!loading && !error && results.length > 0 && (
          <div className="concordance-results">
            {results.map((result) => (
              <button
                key={result.id}
                className="concordance-result"
                onClick={() =>
                  onVerseClick &&
                  onVerseClick(result.bookCode, result.chapter, result.verse)
                }
              >
                <span className="concordance-result-ref">
                  {formatReference(
                    result.bookCode,
                    result.chapter,
                    result.verse,
                  )}
                </span>
                <span className="concordance-result-text">
                  {truncateText(result.text)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ConcordanceScreen;
