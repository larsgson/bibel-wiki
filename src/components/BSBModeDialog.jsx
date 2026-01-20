import React from "react";
import "./BSBModeDialog.css";

const DISPLAY_MODES = {
  ENG: "eng",
  STRONGS: "strongs",
  INTERLINEAR_COMPACT: "interlinear-compact",
  INTERLINEAR_FULL: "interlinear-full",
};

const MODE_LABELS = {
  [DISPLAY_MODES.ENG]: "ENG",
  [DISPLAY_MODES.STRONGS]: "Strong's",
  [DISPLAY_MODES.INTERLINEAR_COMPACT]: "Compact",
  [DISPLAY_MODES.INTERLINEAR_FULL]: "Full",
};

const MODE_DESCRIPTIONS = {
  [DISPLAY_MODES.ENG]: "English text with clickable words",
  [DISPLAY_MODES.STRONGS]: "English with Strong's numbers inline",
  [DISPLAY_MODES.INTERLINEAR_COMPACT]: "Interlinear cards (compact)",
  [DISPLAY_MODES.INTERLINEAR_FULL]: "Interlinear cards with Strong's numbers",
};

/**
 * BSBModeDialog - Modal dialog for selecting BSB display mode
 * and Hebrew word order preference
 */
function BSBModeDialog({
  isOpen,
  onClose,
  displayMode,
  onModeChange,
  useHebrewOrder,
  onHebrewOrderChange,
  isOldTestament,
}) {
  if (!isOpen) return null;

  const isInterlinear =
    displayMode === DISPLAY_MODES.INTERLINEAR_COMPACT ||
    displayMode === DISPLAY_MODES.INTERLINEAR_FULL;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="bsb-mode-dialog-backdrop" onClick={handleBackdropClick}>
      <div className="bsb-mode-dialog">
        <div className="bsb-mode-dialog-header">
          <h3>Display Mode</h3>
          <button className="bsb-mode-dialog-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="bsb-mode-dialog-content">
          <div className="bsb-mode-options">
            {Object.entries(MODE_LABELS).map(([mode, label]) => (
              <button
                key={mode}
                className={`bsb-mode-option ${displayMode === mode ? "bsb-mode-option-active" : ""}`}
                onClick={() => onModeChange(mode)}
              >
                <span className="bsb-mode-option-label">{label}</span>
                <span className="bsb-mode-option-desc">
                  {MODE_DESCRIPTIONS[mode]}
                </span>
              </button>
            ))}
          </div>

          {/* English word order toggle - only for OT in interlinear modes */}
          {/* Default is Hebrew order (RTL), user can opt into English order (LTR) */}
          {isInterlinear && isOldTestament && (
            <div className="bsb-mode-hebrew-order">
              <label className="bsb-mode-toggle">
                <input
                  type="checkbox"
                  checked={!useHebrewOrder}
                  onChange={(e) => onHebrewOrderChange(!e.target.checked)}
                />
                <span className="bsb-mode-toggle-label">
                  English word order (LTR)
                </span>
                <span className="bsb-mode-toggle-indicator">
                  {useHebrewOrder ? "← עב" : "EN →"}
                </span>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { DISPLAY_MODES, MODE_LABELS };
export default BSBModeDialog;
