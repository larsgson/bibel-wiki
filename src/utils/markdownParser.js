import { getTextForReference, bsbToPlainText } from "./bibleUtils";

/**
 * Replace <<<REF>>> markers in text with actual Bible verses from cache
 * Supports multi-reference strings like "HEB 9:11-14,JOH 1:29, 1PE 1:18-19"
 * For BSB data, converts to plain text for inline replacement
 */
const replaceBibleReferences = (text, chapterText) => {
  if (!text || !chapterText) return text;

  // Find all <<<REF: ...>>> markers in the text
  const refPattern = /<<<REF:\s*(.+?)>>>/g;
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
 * Parse markdown content into structured sections
 * Each section contains an image URL and associated text content
 * @param {string} markdown - The markdown content to parse
 * @param {object} chapterText - Optional cache of loaded Bible chapters
 */
export const parseMarkdownIntoSections = (markdown, chapterText = {}) => {
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

    // Skip story markers
    if (line.startsWith("<<<STORY:")) {
      continue;
    }

    // Extract reference (<<<REF: GEN 1:1-2>>>)
    if (line.startsWith("<<<REF:")) {
      const refMatch = line.match(/<<<REF:\s*(.+?)>>>/);
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

  // Replace <<<REF>>> markers in section text with actual Bible verses
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
