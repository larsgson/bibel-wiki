import { getTextForReference } from "./bible-utils"
import type { Section, ParsedMarkdown } from "./types"

const replaceBibleReferences = (
  text: string,
  chapterText: Record<string, any>,
): string => {
  if (!text || !chapterText) return text

  const refPattern = /\[\[ref:\s*(.+?)\]\]/g
  let result = text
  let match

  while ((match = refPattern.exec(text)) !== null) {
    const fullMatch = match[0]
    const reference = match[1].trim()
    const extractedText = getTextForReference(reference, chapterText)
    if (extractedText) {
      result = result.replace(fullMatch, extractedText)
    }
  }

  return result
}

const replaceLocaleMarkers = (
  text: string,
  localeData: Record<string, any> | null,
): string => {
  if (!text || !localeData) return text

  return text.replace(/\[\[t:([^\]]+)\]\]/g, (fullMatch, keyPath: string) => {
    const parts = keyPath.split(".")

    // "02.14.5.p_hd" → sections[14][5]
    if (parts.length === 4 && parts[3] === "p_hd") {
      const storyNum = parseInt(parts[1], 10)
      const verseNum = parseInt(parts[2], 10)
      const value = localeData.sections?.[storyNum]?.[verseNum]
      return value || fullMatch
    }

    // "02.14.title" or "02.14.description" → stories[14].title
    if (parts.length === 3) {
      const storyNum = parseInt(parts[1], 10)
      const key = parts[2]
      const value = localeData.stories?.[storyNum]?.[key]
      return value || fullMatch
    }

    // "01.title" or "01.description" → categories["01"].title
    if (parts.length === 2) {
      const catId = parts[0]
      const key = parts[1]
      const value = localeData.categories?.[catId]?.[key]
      return value || fullMatch
    }

    // "bookTitle" → localeData.bookTitle
    if (parts.length === 1) {
      const value = localeData[parts[0]] || localeData.bookTitle
      return value || fullMatch
    }

    return fullMatch
  })
}

export const parseMarkdownIntoSections = (
  markdown: string,
  chapterText: Record<string, any> = {},
  localeData: Record<string, any> | null = null,
): ParsedMarkdown => {
  if (!markdown) {
    return { title: "", sections: [] }
  }

  const sections: Section[] = []
  const lines = markdown.split("\n")
  let currentSection: Section | null = null
  let storyTitle = ""

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (line.startsWith("# ") && !storyTitle) {
      let titleText = line.substring(2).trim()
      if (titleText.includes("[[t:")) {
        titleText = replaceLocaleMarkers(titleText, localeData)
      }
      storyTitle = titleText
      continue
    }

    if (line.startsWith("[[story:") || line.startsWith("[[chapter:")) {
      continue
    }

    if (line.includes("[[t:")) {
      const resolved = replaceLocaleMarkers(line, localeData)
      if (!resolved.trim() || (resolved === line && !localeData)) continue
      if (resolved.startsWith("# ") && !storyTitle) {
        storyTitle = resolved.substring(2).trim()
        continue
      }
      // Store ### headings separately so they don't prevent verse text loading
      if (resolved.startsWith("##") && currentSection) {
        currentSection.heading = resolved.replace(/^#+\s*/, "").trim()
        continue
      }
      if (currentSection && resolved.trim()) {
        currentSection.text +=
          (currentSection.text ? "\n" : "") + resolved.trim()
      }
      continue
    }

    if (line.startsWith("[[ref:")) {
      const refMatch = line.match(/\[\[ref:\s*(.+?)\]\]/)
      if (refMatch && currentSection) {
        currentSection.reference = refMatch[1].trim()
      }
      continue
    }

    const imageMatch = line.match(/!\[.*?\]\((.*?)\)/)
    if (imageMatch) {
      // If current section has no reference yet, add image to it (multiple images per section)
      if (currentSection && !currentSection.reference && !currentSection.text.trim()) {
        currentSection.imageUrls.push(imageMatch[1])
      } else {
        if (currentSection) {
          sections.push(currentSection)
        }
        currentSection = {
          imageUrls: [imageMatch[1]],
          text: "",
          reference: "",
        }
      }
    } else if (currentSection && line) {
      currentSection.text += (currentSection.text ? "\n" : "") + line
    }
  }

  if (currentSection) {
    sections.push(currentSection)
  }

  sections.forEach((section) => {
    if (section.text) {
      section.text = replaceBibleReferences(section.text, chapterText)
    }
  })

  sections.forEach((section) => {
    if (section.reference && (!section.text || section.text.trim() === "")) {
      const extractedText = getTextForReference(section.reference, chapterText)
      if (extractedText) {
        section.text = extractedText
      }
    }
  })

  return { title: storyTitle, sections }
}

export const getTitleFromMarkdown = (markdown: string): string => {
  if (!markdown || markdown.length === 0) return ""

  const found = markdown.match(/#[\s|\d|\.]*(.*)\n/)
  if (found?.[1]) return found[1]

  const found2 = markdown.match(/#\s*(\S.*)\n/)
  if (found2?.[1]) return found2[1]

  const found3 = markdown.match(/\s*(\S.*)\n/)
  if (found3?.[1]) return found3[1]

  const found4 = markdown.match(/.*(\w.*)\n/)
  return found4?.[1] || ""
}
