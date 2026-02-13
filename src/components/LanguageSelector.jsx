import { useState, useEffect, useMemo } from "react";
import "./LanguageSelector.css";
import useLanguage from "../hooks/useLanguage";
import useTranslation from "../hooks/useTranslation";

function LanguageSelector({
  selectedLanguage,
  onSelect,
  onClose,
  excludeLanguages = [],
  title = null,
  allowNone = false,
  learnMode = false,
  onLearnModeChange = null,
}) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [learnMessage, setLearnMessage] = useState(null);
  const {
    languageNames,
    languageData,
    selectedLanguage: primaryLangCode,
    secondaryLanguage: secondaryLangCode,
  } = useLanguage();

  // Check if primary language has audio timing available
  const hasAudioTiming = useMemo(() => {
    if (!primaryLangCode) return false;
    const langData = languageData[primaryLangCode];
    if (!langData) return false;
    return (
      langData.ot?.directAudio ||
      langData.nt?.directAudio ||
      ["with-timecode", "audio-with-timecode"].includes(
        langData.ot?.audioCategory,
      ) ||
      ["with-timecode", "audio-with-timecode"].includes(
        langData.nt?.audioCategory,
      )
    );
  }, [primaryLangCode, languageData]);

  // Determine indicator state
  const indicatorState = useMemo(() => {
    if (!primaryLangCode || !secondaryLangCode) return "state-unavailable";
    if (!hasAudioTiming) return "state-no-audio";
    return learnMode ? "state-ready-on" : "state-ready-off";
  }, [primaryLangCode, secondaryLangCode, hasAudioTiming, learnMode]);

  const indicatorLabel = useMemo(() => {
    if (indicatorState === "state-ready-on")
      return t("languageSelector.learnModeOn");
    return t("languageSelector.learnLanguage");
  }, [indicatorState, t]);

  const handleLearnToggle = () => {
    if (!primaryLangCode || !secondaryLangCode) {
      setLearnMessage(t("languageSelector.needTwoLanguages"));
      setTimeout(() => setLearnMessage(null), 5000);
      return;
    }
    if (!hasAudioTiming) {
      setLearnMessage(t("languageSelector.noAudioAvailable"));
      setTimeout(() => setLearnMessage(null), 5000);
      return;
    }
    // Toggle learn mode
    onLearnModeChange?.(!learnMode);
  };

  useEffect(() => {
    const loadLanguages = async () => {
      try {
        const response = await fetch("/ALL-langs-compact.json");
        const data = await response.json();

        const langList = [];
        if (data.canons?.nt) {
          Object.keys(data.canons.nt).forEach((category) => {
            const categoryData = data.canons.nt[category];
            Object.keys(categoryData).forEach((code) => {
              const lang = categoryData[code];
              if (!langList.find((l) => l.code === code)) {
                langList.push({
                  code,
                  english: lang.n,
                  vernacular: lang.v,
                  category,
                });
              }
            });
          });
        }

        langList.sort((a, b) => a.english.localeCompare(b.english));
        setLanguages(langList);
        setLoading(false);
      } catch (error) {
        console.error("Error loading languages:", error);
        setLoading(false);
      }
    };

    loadLanguages();
  }, []);

  const filteredLanguages = useMemo(() => {
    // First filter out excluded languages
    let filtered = languages.filter(
      (lang) => !excludeLanguages.includes(lang.code),
    );

    // Then apply search filter
    if (!searchTerm.trim()) {
      return filtered;
    }

    const search = searchTerm.toLowerCase();
    return filtered.filter((lang) => {
      const english = (lang.english || "").toLowerCase();
      const vernacular = (lang.vernacular || "").toLowerCase();
      const code = (lang.code || "").toLowerCase();

      return (
        english.includes(search) ||
        vernacular.includes(search) ||
        code.includes(search)
      );
    });
  }, [languages, searchTerm, excludeLanguages]);

  const handleLanguageClick = (language) => {
    onSelect(language);
    onClose();
  };

  const handleNoneClick = () => {
    onSelect(null);
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  const getCategoryColor = (category) => {
    const colors = {
      "with-timecode": "#28a745",
      syncable: "#17a2b8",
      "audio-only": "#ffc107",
      "text-only": "#6c757d",
      "incomplete-timecode": "#dc3545",
    };
    return colors[category] || "#6c757d";
  };

  return (
    <div className="language-selector-overlay" onClick={handleClose}>
      <div
        className="language-selector-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="language-selector-header">
          <h2>{title || t("languageSelector.title")}</h2>
          <button
            className="close-button"
            onClick={handleClose}
            aria-label={t("languageSelector.close")}
          >
            ✕
          </button>
        </div>

        <div className="language-selector-body">
          {/* Current Language Display */}
          <div className="current-language-section">
            <div className="language-status">
              <span className="status-label">Current:</span>
              <span className="status-value">
                {selectedLanguage ? (
                  <>
                    <strong>
                      {selectedLanguage.english || selectedLanguage.code}
                    </strong>
                    {selectedLanguage.vernacular && (
                      <span className="vernacular">
                        {" "}
                        ({selectedLanguage.vernacular})
                      </span>
                    )}
                    <span className="language-code">
                      {" "}
                      [{selectedLanguage.code}]
                    </span>
                  </>
                ) : (
                  <span className="no-language">
                    {t("languageSelector.noLanguageSelected")}
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Search Box */}
          <div className="search-section">
            <input
              type="text"
              className="language-search"
              placeholder={t("languageSelector.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>

          {/* Language List */}
          <div className="language-list">
            {loading ? (
              <div className="loading-state">
                {t("languageSelector.loadingLanguages")}
              </div>
            ) : filteredLanguages.length === 0 ? (
              <div className="empty-state">
                {t("languageSelector.noLanguagesFound")} "{searchTerm}"
              </div>
            ) : (
              <>
                {allowNone && !searchTerm && (
                  <div
                    className={`language-item none-option ${!selectedLanguage ? "active" : ""}`}
                    onClick={handleNoneClick}
                  >
                    <div className="language-info">
                      <div className="language-name">
                        <em>{t("languageSelector.none")}</em>
                        {!selectedLanguage && (
                          <span className="check-icon"> ✓</span>
                        )}
                      </div>
                      <div className="language-vernacular">
                        {t("languageSelector.noSecondaryLanguage")}
                      </div>
                    </div>
                  </div>
                )}
                {filteredLanguages.map((language) => {
                  const isActive = selectedLanguage?.code === language.code;

                  return (
                    <div
                      key={language.code}
                      className={`language-item ${isActive ? "active" : ""}`}
                      onClick={() => handleLanguageClick(language)}
                    >
                      <div className="language-info">
                        <div className="language-name">
                          {language.english || language.code}
                          {isActive && <span className="check-icon"> ✓</span>}
                        </div>
                        {language.vernacular && (
                          <div className="language-vernacular">
                            {language.vernacular}
                          </div>
                        )}
                        <div className="language-code-small">
                          {language.code}
                        </div>
                      </div>
                      <div
                        className="language-category-indicator"
                        style={{
                          backgroundColor: getCategoryColor(language.category),
                        }}
                        title={language.category}
                      />
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Footer with Actions */}
        <div className="language-selector-footer">
          {onLearnModeChange && (
            <div className="learn-indicator-section">
              <div
                className={`learn-indicator ${indicatorState}`}
                onClick={handleLearnToggle}
                role="switch"
                aria-checked={learnMode}
              >
                <span className="learn-indicator-dot" />
                <span className="learn-indicator-label">{indicatorLabel}</span>
              </div>
              {learnMessage && (
                <div className="learn-message">{learnMessage}</div>
              )}
            </div>
          )}
          <div
            className={`action-buttons ${onLearnModeChange ? "" : "single"}`}
          >
            <button className="button-secondary" onClick={handleClose}>
              {t("languageSelector.close")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LanguageSelector;
