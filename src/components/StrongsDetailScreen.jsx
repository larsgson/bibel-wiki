import React, { useEffect, useState } from "react";
import { getLexiconEntry, getStrongsLanguage } from "../helpers/strongsApi";
import "./StrongsDetailScreen.css";

/**
 * StrongsDetailScreen - Full screen view of Strong's lexicon entry
 */
function StrongsDetailScreen({ strongsNumber, onBack, onConcordance }) {
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!strongsNumber) {
      setEntry(null);
      setLoading(false);
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
  }, [strongsNumber]);

  const language = strongsNumber ? getStrongsLanguage(strongsNumber) : "";
  const isHebrew = language === "Hebrew";

  if (loading) {
    return (
      <div className="strongs-detail-screen">
        <div className="strongs-detail-header">
          <button className="strongs-detail-back" onClick={onBack}>
            ←
          </button>
          <span className="strongs-detail-title">Loading...</span>
        </div>
        <div className="strongs-detail-loading">Loading lexicon entry...</div>
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="strongs-detail-screen">
        <div className="strongs-detail-header">
          <button className="strongs-detail-back" onClick={onBack}>
            ←
          </button>
          <span className="strongs-detail-title">{strongsNumber}</span>
        </div>
        <div className="strongs-detail-error">{error || "Entry not found"}</div>
      </div>
    );
  }

  return (
    <div className="strongs-detail-screen" onClick={(e) => e.stopPropagation()}>
      {/* Header */}
      <div className="strongs-detail-header">
        <button
          className="strongs-detail-back"
          onClick={(e) => {
            e.stopPropagation();
            onBack();
          }}
        >
          ←
        </button>
        <span
          className={`strongs-detail-word ${isHebrew ? "strongs-detail-word-hebrew" : ""}`}
        >
          {entry.word}
        </span>
        <span
          className={`strongs-detail-badge ${isHebrew ? "strongs-detail-badge-hebrew" : "strongs-detail-badge-greek"}`}
        >
          {language}
        </span>
      </div>

      {/* Content */}
      <div className="strongs-detail-content">
        {/* Strong's Code */}
        <div className="strongs-detail-code">{strongsNumber}</div>

        {/* Transliteration */}
        {entry.translit && (
          <div className="strongs-detail-translit">{entry.translit}</div>
        )}

        {/* Pronunciation */}
        {entry.pron && (
          <div className="strongs-detail-pron">/{entry.pron}/</div>
        )}

        {/* Gloss */}
        {entry.gloss && (
          <div className="strongs-detail-section">
            <div className="strongs-detail-label">Gloss</div>
            <div className="strongs-detail-value">{entry.gloss}</div>
          </div>
        )}

        {/* Definition */}
        {entry.def && (
          <div className="strongs-detail-section">
            <div className="strongs-detail-label">Definition</div>
            <div className="strongs-detail-value strongs-detail-def">
              {entry.def}
            </div>
          </div>
        )}

        {/* Morphology (if available) */}
        {entry.morph && (
          <div className="strongs-detail-section">
            <div className="strongs-detail-label">Morphology</div>
            <div className="strongs-detail-value">{entry.morph}</div>
          </div>
        )}

        {/* Extended Definition (stepDef) */}
        {entry.stepDef && entry.stepDef !== entry.def && (
          <div className="strongs-detail-section">
            <div className="strongs-detail-label">Extended Definition</div>
            <div className="strongs-detail-value strongs-detail-extended">
              {entry.stepDef}
            </div>
          </div>
        )}

        {/* Full Definition */}
        {entry.fullDef && entry.fullDef !== entry.def && (
          <div className="strongs-detail-section">
            <div className="strongs-detail-label">Full Definition</div>
            <div className="strongs-detail-value strongs-detail-full">
              {entry.fullDef}
            </div>
          </div>
        )}

        {/* KJV Usage */}
        {entry.kjv && (
          <div className="strongs-detail-section">
            <div className="strongs-detail-label">KJV Usage</div>
            <div className="strongs-detail-value strongs-detail-kjv">
              {entry.kjv}
            </div>
          </div>
        )}

        {/* Concordance Button */}
        <div className="strongs-detail-actions">
          <button
            className="strongs-detail-concordance-btn"
            onClick={(e) => {
              e.stopPropagation();
              onConcordance && onConcordance(strongsNumber);
            }}
          >
            View Concordance
          </button>
        </div>
      </div>
    </div>
  );
}

export default StrongsDetailScreen;
