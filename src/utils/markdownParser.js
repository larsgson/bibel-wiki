import { getTextForReference, bsbToPlainText } from "./bibleUtils";

/**
 * Replace [[ref:...]] markers in text with actual Bible verses from cache
 * Supports multi-reference strings like "HEB 9:11-14,JOH 1:29, 1PE 1:18-19"
 * For BSB data, converts to plain text for inline replacement
 */
const replaceBibleReferences = (text, chapterText) => {
  if (!text || !chapterText) return text;

  // Find all [[ref:...]] markers in the text
  const refPattern = /\[\[ref:\s*(.+?)\]\]/g;
  let result = text;
  let match;

  while ((match = refPattern.exec(text)) !== null) {
    const fullMatch = match[0];
    const reference = match[1].trim();

    // Use getTextForReference which handles multi-reference strings
    const extractedText = getTextForReference(reference, chapterText);
    if (extractedText) {
      // If BSB format, convert to plain text for inline replacement
      const plainText =
        typeof extractedText === "object" && extractedText.isBSB
          ? bsbToPlainText(extractedText)
          : extractedText;
      result = result.replace(fullMatch, plainText);
    }
  }

  return result;
};

/**
 * Replace [[t:...]] locale markers in text with resolved locale values.
 * Key format: "09.13.p_hd" → localeData["09.13"]["p_hd"]
 *             "09.title"   → localeData["09"]["title"]
 * The last dot-separated segment is the key; everything before is the section.
 */
const replaceLocaleMarkers = (text, localeData) => {
  if (!text || !localeData) return text;

  return text.replace(/\[\[t:([^\]]+)\]\]/g, (fullMatch, keyPath) => {
    const lastDot = keyPath.lastIndexOf(".");
    if (lastDot === -1) {
      // Top-level key (e.g. "title")
      const value = localeData[keyPath];
      return value || fullMatch;
    }

    const section = keyPath.substring(0, lastDot);
    const key = keyPath.substring(lastDot + 1);
    const value = localeData[section]?.[key];
    return value || fullMatch;
  });
};

/**
 * Parse markdown content into structured sections
 * Each section contains an image URL and associated text content
 * @param {string} markdown - The markdown content to parse
 * @param {object} chapterText - Optional cache of loaded Bible chapters
 * @param {object} localeData - Optional locale data for resolving [[t:...]] markers
 */
export const parseMarkdownIntoSections = (
  markdown,
  chapterText = {},
  localeData = null,
) => {
  if (!markdown) {
    return { title: "", sections: [] };
  }

  const sections = [];
  const lines = markdown.split("\n");
  let currentSection = null;
  let storyTitle = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Extract story title (H1)
    if (line.startsWith("# ") && !storyTitle) {
      storyTitle = line.substring(2).trim();
      continue;
    }

    // Skip story/chapter markers
    if (line.startsWith("[[story:") || line.startsWith("[[chapter:")) {
      continue;
    }

    // Resolve locale text interpolation markers
    if (line.includes("[[t:")) {
      const resolved = replaceLocaleMarkers(line, localeData);
      // If fully resolved to empty or still just a marker, skip
      if (!resolved.trim() || (resolved === line && !localeData)) continue;
      // Re-process the resolved line (it may be a heading, text, etc.)
      // Check if it's a heading that should become the story title
      if (resolved.startsWith("# ") && !storyTitle) {
        storyTitle = resolved.substring(2).trim();
        continue;
      }
      // Add as text to current section
      if (currentSection && resolved.trim()) {
        currentSection.text +=
          (currentSection.text ? "\n" : "") + resolved.trim();
      }
      continue;
    }

    // Extract reference ([[ref:GEN 1:1-2]])
    if (line.startsWith("[[ref:")) {
      const refMatch = line.match(/\[\[ref:\s*(.+?)\]\]/);
      if (refMatch && currentSection) {
        currentSection.reference = refMatch[1].trim();
      }
      continue;
    }

    // Check if line contains an image
    const imageMatch = line.match(/!\[.*?\]\((.*?)\)/);
    if (imageMatch) {
      // Save previous section if exists (even if no text content)
      if (currentSection) {
        sections.push(currentSection);
      }

      // Start new section
      currentSection = {
        imageUrl: imageMatch[1],
        text: "",
        reference: "",
      };
    } else if (currentSection && line) {
      // Add text to current section
      currentSection.text += (currentSection.text ? "\n" : "") + line;
    }
  }

  // Add last section (even if no text content)
  if (currentSection) {
    sections.push(currentSection);
  }

  // Replace [[ref:...]] markers in section text with actual Bible verses
  sections.forEach((section) => {
    if (section.text) {
      section.text = replaceBibleReferences(section.text, chapterText);
    }
  });

  // For sections with reference but no text, load the Bible text directly
  sections.forEach((section) => {
    if (section.reference && (!section.text || section.text.trim() === "")) {
      const extractedText = getTextForReference(section.reference, chapterText);
      if (extractedText) {
        // Check if it's BSB format - store both BSB data and plain text
        if (typeof extractedText === "object" && extractedText.isBSB) {
          section.bsbData = extractedText;
          section.text = bsbToPlainText(extractedText);
        } else {
          section.text = extractedText;
        }
      }
    }
  });

  return {
    title: storyTitle,
    sections: sections,
  };
};

/**
 * Extract title from markdown content
 */
export const getTitleFromMarkdown = (markdown) => {
  if (!markdown || markdown.length === 0) {
    return "";
  }

  // Try to find H1 header
  const regExpr = /#[\s|\d|\.]*(.*)\n/;
  const found = markdown.match(regExpr);
  if (found?.[1]) {
    return found[1];
  }

  // Try without number ID string
  const regExpr2 = /#\s*(\S.*)\n/;
  const found2 = markdown.match(regExpr2);
  if (found2?.[1]) {
    return found2[1];
  }

  // Try any non-empty line
  const regExpr3 = /\s*(\S.*)\n/;
  const found3 = markdown.match(regExpr3);
  if (found3?.[1]) {
    return found3[1];
  }

  // Last resort
  const regExpr4 = /.*(\w.*)\n/;
  const found4 = markdown.match(regExpr4);
  return found4?.[1] || "";
};
