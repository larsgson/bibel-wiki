import React, { useState, useRef, useEffect } from "react";
import "./LanguageSwitcher.css";

/**
 * Dropdown language selector for audio playback
 * - Shows current language as 3-letter code
 * - Click to open dropdown with available languages
 */
function LanguageSwitcher({
  availableLanguages = [],
  currentLanguage,
  onLanguageChange,
  compact = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("touchstart", handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleToggle = (e) => {
    e.stopPropagation();
    if (availableLanguages.length > 1) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (langCode, e) => {
    e.stopPropagation();
    onLanguageChange(langCode);
    setIsOpen(false);
  };

  if (availableLanguages.length === 0) {
    return null;
  }

  const showDropdown = availableLanguages.length > 1;

  return (
    <div
      ref={containerRef}
      className={`language-switcher ${compact ? "language-switcher-compact" : ""} ${isOpen ? "open" : ""}`}
    >
      <button
        className="language-switcher-button"
        onClick={handleToggle}
        aria-haspopup={showDropdown ? "listbox" : undefined}
        aria-expanded={showDropdown ? isOpen : undefined}
        title={showDropdown ? "Select audio language" : "Audio language"}
      >
        <span className="language-switcher-label">
          {currentLanguage?.toUpperCase() || "—"}
        </span>
        {showDropdown && (
          <svg
            className="language-switcher-chevron"
            width="12"
            height="12"
            viewBox="0 0 24 24"
          >
            <path
              d="M7 10l5 5 5-5"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
          </svg>
        )}
      </button>

      {showDropdown && isOpen && (
        <div className="language-switcher-dropdown" role="listbox">
          {availableLanguages.map((langCode) => (
            <button
              key={langCode}
              className={`language-switcher-option ${langCode === currentLanguage ? "selected" : ""}`}
              onClick={(e) => handleSelect(langCode, e)}
              role="option"
              aria-selected={langCode === currentLanguage}
            >
              {langCode.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default LanguageSwitcher;
