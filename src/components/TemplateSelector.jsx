import { useState, useEffect } from "react";
import "./NavigationGrid.css";
import useLanguage from "../hooks/useLanguage";

// Known template directories (extend this list to add more)
const TEMPLATE_IDS = ["OBS", "John"];

// Fallback images when index.toml has no [image] section
const FALLBACK_IMAGES = {
  OBS: "/img/obs-icon.png",
};

function TemplateSelector({ onTemplateSelect }) {
  const { selectedLanguage } = useLanguage();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, [selectedLanguage]);

  const parseToml = (text) => {
    const result = {};
    let inImage = false;

    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("#") || trimmed === "") continue;

      if (trimmed === "[image]") {
        inImage = true;
        result.image = {};
        continue;
      }
      if (trimmed.startsWith("[")) {
        inImage = false;
        continue;
      }

      const kvMatch = trimmed.match(/^(\w+)\s*=\s*"((?:[^"\\]|\\.)*)"/);
      if (kvMatch) {
        if (inImage) {
          result.image[kvMatch[1]] = kvMatch[2];
        } else {
          result[kvMatch[1]] = kvMatch[2];
        }
      }
    }

    return result;
  };

  const parseLocaleToml = (text) => {
    const result = {};
    let currentSection = null;

    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("#") || trimmed === "") continue;

      const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/);
      if (sectionMatch) {
        currentSection = sectionMatch[1];
        if (!result[currentSection]) result[currentSection] = {};
        continue;
      }

      const kvMatch = trimmed.match(/^(\w+)\s*=\s*"((?:[^"\\]|\\.)*)"/);
      if (kvMatch) {
        if (currentSection) {
          result[currentSection][kvMatch[1]] = kvMatch[2].replace(/\\"/g, '"');
        } else {
          result[kvMatch[1]] = kvMatch[2].replace(/\\"/g, '"');
        }
      }
    }

    return result;
  };

  const resolveImage = (templateId, indexData) => {
    const filename = indexData.image?.filename;
    if (filename) {
      // Absolute paths used as-is, relative ones get a prefix
      if (filename.startsWith("/") || filename.startsWith("http")) {
        return filename;
      }
      return `/img/${templateId.toLowerCase()}-pics/${filename}`;
    }
    return FALLBACK_IMAGES[templateId] || "/img/obs-icon.png";
  };

  const loadTemplates = async () => {
    const loaded = [];

    for (const templateId of TEMPLATE_IDS) {
      try {
        const indexResponse = await fetch(
          `/templates/${templateId}/index.toml`,
        );
        if (!indexResponse.ok) continue;

        const indexText = await indexResponse.text();
        const indexData = parseToml(indexText);

        // Load English locale as base, then overlay selected language
        let title;
        try {
          const engResponse = await fetch(
            `/templates/${templateId}/locales/eng.toml`,
          );
          if (engResponse.ok) {
            const engData = parseLocaleToml(await engResponse.text());
            title = engData.title;
          }
        } catch {
          // English not available
        }

        if (selectedLanguage && selectedLanguage !== "eng") {
          try {
            const langResponse = await fetch(
              `/templates/${templateId}/locales/${selectedLanguage}.toml`,
            );
            if (langResponse.ok) {
              const langData = parseLocaleToml(await langResponse.text());
              if (langData.title) {
                title = langData.title;
              }
            }
          } catch {
            // Selected language not available, keep English
          }
        }

        loaded.push({
          id: templateId,
          title,
          image: resolveImage(templateId, indexData),
          layoutTheme: indexData.layout_theme || null,
        });
      } catch {
        // Skip templates that fail to load
      }
    }

    setTemplates(loaded);
    setLoading(false);
  };

  if (loading) {
    return <div className="navigation-loading">Loading...</div>;
  }

  return (
    <div className="navigation-container">
      <div className="navigation-grid collection">
        {templates.map((template) => (
          <div
            key={template.id}
            className="navigation-item category"
            onClick={() => onTemplateSelect(template)}
          >
            <div
              className="category-icon-wrapper"
              style={{ position: "relative" }}
            >
              <div className="category-icon-clipped">
                <img
                  src={template.image}
                  alt={template.title}
                  className="navigation-image"
                  onError={(e) => {
                    e.target.src = "/img/obs-icon.png";
                  }}
                />
                <div className="navigation-item-title">{template.title}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TemplateSelector;
