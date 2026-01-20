import React, { useEffect, useState } from "react";
import { getLexiconEntry, getStrongsLanguage } from "../helpers/strongsApi";
import StrongsDetailScreen from "./StrongsDetailScreen";
import ConcordanceScreen from "./ConcordanceScreen";
import "./LexiconModal.css";

/**
 * LexiconModal component - bottom sheet modal showing Strong's lexicon entry
 * Now includes navigation to Detail and Concordance screens
 */
function LexiconModal({ strongsNumber, isOpen, onClose }) {
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [screen, setScreen] = useState("modal"); // 'modal', 'detail', 'concordance'

  useEffect(() => {
    if (!strongsNumber || !isOpen) {
      setEntry(null);
      setError(null);
      setScreen("modal");
      return;
    }

    setLoading(true);
    setError(null);

    getLexiconEntry(strongsNumber)
      .then((data) => {
        if (data) {
          setEntry(data);
        } else {
          setError("Entry not found");
        }
      })
      .catch((err) => {
        console.error("Error loading lexicon entry:", err);
        setError("Failed to load entry");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [strongsNumber, isOpen]);

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (screen !== "modal") {
          setScreen("modal");
        } else {
          onClose();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, screen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Reset screen when modal closes
  useEffect(() => {
    if (!isOpen) {
      setScreen("modal");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Show Detail Screen
  if (screen === "detail") {
    return (
      <StrongsDetailScreen
        strongsNumber={strongsNumber}
        onBack={() => setScreen("modal")}
        onConcordance={(strongs) => {
          setScreen("concordance");
        }}
      />
    );
  }

  // Show Concordance Screen
  if (screen === "concordance") {
    return (
      <ConcordanceScreen
        strongsNumber={strongsNumber}
        onBack={() => setScreen("modal")}
        onVerseClick={(bookCode, chapter, verse) => {
          // For now, just log the navigation
          // In the future, this could navigate to the verse in the reader
          console.log(`Navigate to ${bookCode} ${chapter}:${verse}`);
          // Close the modal after selecting a verse
          onClose();
        }}
      />
    );
  }

  // Show Modal (default)
  const language = strongsNumber ? getStrongsLanguage(strongsNumber) : "";
  const isHebrew = language === "Hebrew";

  return (
    <>
      {/* Overlay */}
      <div
        className={`lexicon-overlay ${isOpen ? "lexicon-overlay-visible" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom Sheet */}
      <div
        className={`lexicon-modal ${isOpen ? "lexicon-modal-visible" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lexicon-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="lexicon-handle">
          <div className="lexicon-handle-bar" />
        </div>

        {/* Content */}
        <div className="lexicon-content">
          {/* Header */}
          <div className="lexicon-header">
            <span
              className={`lexicon-badge ${isHebrew ? "lexicon-badge-hebrew" : "lexicon-badge-greek"}`}
            >
              {language}
            </span>
            <span className="lexicon-strongs-code">{strongsNumber}</span>
            <button
              className="lexicon-close-btn"
              onClick={onClose}
              aria-label="Close"
            >
              &times;
            </button>
          </div>

          {/* Loading state */}
          {loading && <div className="lexicon-loading">Loading...</div>}

          {/* Error state */}
          {error && !loading && <div className="lexicon-error">{error}</div>}

          {/* Entry content */}
          {entry && !loading && (
            <>
              {/* Original word */}
              <div className="lexicon-word" id="lexicon-title">
                {entry.word}
              </div>
              <div className="lexicon-underline" />

              {/* Transliteration */}
              {entry.translit && (
                <div className="lexicon-translit">{entry.translit}</div>
              )}

              {/* Pronunciation */}
              {entry.pron && <div className="lexicon-pron">/{entry.pron}/</div>}

              {/* Gloss (short meaning) */}
              {entry.gloss && (
                <div className="lexicon-section">
                  <div className="lexicon-label">Gloss</div>
                  <div className="lexicon-gloss">{entry.gloss}</div>
                </div>
              )}

              {/* Definition */}
              {entry.def && (
                <div className="lexicon-section">
                  <div className="lexicon-label">Definition</div>
                  <div className="lexicon-def">{entry.def}</div>
                </div>
              )}

              {/* Extended definition (if available) */}
              {entry.fullDef && entry.fullDef !== entry.def && (
                <div className="lexicon-section">
                  <div className="lexicon-label">Extended</div>
                  <div className="lexicon-full-def">{entry.fullDef}</div>
                </div>
              )}

              {/* KJV usage (if available) */}
              {entry.kjv && (
                <div className="lexicon-section">
                  <div className="lexicon-label">KJV Usage</div>
                  <div className="lexicon-kjv">{entry.kjv}</div>
                </div>
              )}
            </>
          )}

          {/* Action buttons */}
          {entry && !loading && (
            <div className="lexicon-actions">
              <button
                className="lexicon-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setScreen("detail");
                }}
              >
                View Details
              </button>
              <button
                className="lexicon-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setScreen("concordance");
                }}
              >
                Concordance
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default LexiconModal;
