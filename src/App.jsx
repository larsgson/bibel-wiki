import { useState, useEffect } from "react";
import "./App.css";
import NavigationGrid from "./components/NavigationGrid";
import StoryViewer from "./components/StoryViewer";
import LanguageSelector from "./components/LanguageSelector";
import MinimizedAudioPlayer from "./components/MinimizedAudioPlayer";
import { LanguageProvider } from "./context/LanguageContext";
import { MediaPlayerProvider } from "./context/MediaPlayerContext";
import useTranslation from "./hooks/useTranslation";
import useMediaPlayer from "./hooks/useMediaPlayer";

function AppContentInner({
  selectedLanguage,
  secondaryLanguage,
  onLanguageSelect,
  onSecondaryLanguageSelect,
}) {
  const { t } = useTranslation();
  const { currentPlaylist, setMinimized, isMinimized, currentStoryData } =
    useMediaPlayer();
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [showSecondaryLanguageSelector, setShowSecondaryLanguageSelector] =
    useState(false);
  const [selectedStory, setSelectedStory] = useState(null);
  const [showEmptyContent, setShowEmptyContent] = useState(false);

  const handleOpenLanguageSelector = () => {
    setShowLanguageSelector(true);
  };

  const handleCloseLanguageSelector = () => {
    setShowLanguageSelector(false);
  };

  const handleLanguageSelect = (language) => {
    onLanguageSelect(language);
    setShowLanguageSelector(false);
  };

  const handleOpenSecondaryLanguageSelector = () => {
    setShowSecondaryLanguageSelector(true);
  };

  const handleCloseSecondaryLanguageSelector = () => {
    setShowSecondaryLanguageSelector(false);
  };

  const handleSecondaryLanguageSelect = (language) => {
    onSecondaryLanguageSelect(language);
    setShowSecondaryLanguageSelector(false);
  };

  const handleBackToGrid = () => {
    // Auto-minimize the player when navigating away from a story
    if (currentPlaylist && currentPlaylist.length > 0) {
      setMinimized(true);
    }
    setSelectedStory(null);
  };

  // Get display name for language button
  const getLanguageDisplayName = () => {
    if (!selectedLanguage) return t("app.selectLanguage");

    const name =
      selectedLanguage.vernacular ||
      selectedLanguage.english ||
      selectedLanguage.code;

    // For very long names (>50 chars), truncate but keep meaningful content
    if (name.length > 50) {
      return name.substring(0, 47) + "...";
    }

    return name;
  };

  // Get display name for secondary language button
  const getSecondaryLanguageDisplayName = () => {
    if (!secondaryLanguage) return "+";

    const name =
      secondaryLanguage.vernacular ||
      secondaryLanguage.english ||
      secondaryLanguage.code;

    if (name.length > 50) {
      return name.substring(0, 47) + "...";
    }

    return name;
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">{t("app.title")}</h1>
          <div className="language-buttons-container">
            <button
              className="language-button"
              onClick={handleOpenLanguageSelector}
              aria-label={t("app.changeLanguage")}
            >
              <div className="language-icon-wrapper">
                <span className="language-icon">🌐</span>
                <span className="language-code-mobile">
                  {selectedLanguage?.code || "fra"}
                </span>
              </div>
              <span className="language-text-desktop">
                {getLanguageDisplayName()}
              </span>
            </button>
            <button
              className={`language-button secondary-language-button ${!secondaryLanguage ? "add-button" : ""}`}
              onClick={handleOpenSecondaryLanguageSelector}
              aria-label={
                secondaryLanguage
                  ? "Change secondary language"
                  : "Add secondary language"
              }
            >
              {secondaryLanguage ? (
                <>
                  <div className="language-icon-wrapper">
                    <span className="language-icon">🌐</span>
                    <span className="language-code-mobile">
                      {secondaryLanguage.code}
                    </span>
                  </div>
                  <span className="language-text-desktop">
                    {getSecondaryLanguageDisplayName()}
                  </span>
                </>
              ) : (
                <span className="add-icon">+</span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        {!selectedStory && (
          <NavigationGrid
            onStorySelect={setSelectedStory}
            showEmptyContent={showEmptyContent}
            onToggleEmptyContent={() => setShowEmptyContent(!showEmptyContent)}
          />
        )}
        {selectedStory && (
          <StoryViewer storyData={selectedStory} onBack={handleBackToGrid} />
        )}
      </main>

      {showLanguageSelector && (
        <LanguageSelector
          selectedLanguage={selectedLanguage}
          onSelect={handleLanguageSelect}
          onClose={handleCloseLanguageSelector}
        />
      )}
      {showSecondaryLanguageSelector && (
        <LanguageSelector
          selectedLanguage={secondaryLanguage}
          onSelect={handleSecondaryLanguageSelect}
          onClose={handleCloseSecondaryLanguageSelector}
          excludeLanguages={[selectedLanguage?.code, "eng"]}
          title="Select Secondary Language"
          allowNone={true}
        />
      )}

      {/* Global minimized audio player - shows when playlist is active and minimized */}
      {isMinimized && currentPlaylist && currentPlaylist.length > 0 && (
        <MinimizedAudioPlayer
          onNavigateToStory={() => {
            if (currentStoryData) {
              setSelectedStory(currentStoryData);
              setMinimized(false);
            }
          }}
        />
      )}
    </div>
  );
}

// Wrapper component that provides MediaPlayerProvider context
function AppContent(props) {
  return (
    <MediaPlayerProvider>
      <AppContentInner {...props} />
    </MediaPlayerProvider>
  );
}

function App() {
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    const saved = localStorage.getItem("selectedLanguage");
    return saved ? JSON.parse(saved) : null;
  });

  const [secondaryLanguage, setSecondaryLanguage] = useState(() => {
    const saved = localStorage.getItem("secondaryLanguage");
    return saved ? JSON.parse(saved) : null;
  });

  // Persist language selection to localStorage
  useEffect(() => {
    if (selectedLanguage) {
      localStorage.setItem(
        "selectedLanguage",
        JSON.stringify(selectedLanguage),
      );
    } else {
      localStorage.removeItem("selectedLanguage");
    }
  }, [selectedLanguage]);

  // Persist secondary language selection to localStorage
  useEffect(() => {
    if (secondaryLanguage) {
      localStorage.setItem(
        "secondaryLanguage",
        JSON.stringify(secondaryLanguage),
      );
    } else {
      localStorage.removeItem("secondaryLanguage");
    }
  }, [secondaryLanguage]);

  const languageCode = selectedLanguage?.code || "fra";
  const secondaryLanguageCode = secondaryLanguage?.code || null;

  return (
    <LanguageProvider
      initialLanguage={languageCode}
      initialSecondaryLanguage={secondaryLanguageCode}
    >
      <AppContent
        selectedLanguage={selectedLanguage}
        secondaryLanguage={secondaryLanguage}
        onLanguageSelect={setSelectedLanguage}
        onSecondaryLanguageSelect={setSecondaryLanguage}
      />
    </LanguageProvider>
  );
}

export default App;
