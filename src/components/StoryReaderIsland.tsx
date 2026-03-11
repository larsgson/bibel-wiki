import { useState, useEffect, useRef, useCallback } from "react"
import { useStore } from "@nanostores/react"
import {
  $selectedLanguage,
  $secondaryLanguages,
  $selectedLanguages,
  $engIsExplicit,
  $languageNames,
  loadLanguageData,
  loadLanguageNames,
} from "../stores/language-store"
import { $chapterText, loadChapter } from "../stores/chapter-store"
import {
  $audioPlayState,
  $currentVerseIdx,
  $currentVerseEntries,
  $focusMode,
  $audioPageStory,
  playVerse,
  setAudioForChapter,
  unlockAudio,
  registerAudioCallbacks,
} from "../stores/audio-store"
import { parseMarkdownIntoSections } from "../lib/markdown-parser"
import { parseReference, splitReference, getTestament } from "../lib/bible-utils"
import { parseTextFilesetId, parseAudioFilesetId } from "../lib/fileset-utils"
import StorySection from "./StorySection"
import { buildLangHref } from "../lib/url-utils"
import type { Section, LocaleData } from "../lib/types"

interface Props {
  templateName: string
  categoryId: string
  storyId: string
  engLocale: LocaleData | null
  imageIndex: Record<number, Record<number, string[]>>
  markdownContent: string
  allLocales: Record<string, LocaleData>
}

export default function StoryReaderIsland({
  templateName,
  categoryId,
  storyId,
  engLocale,
  imageIndex,
  markdownContent,
  allLocales,
}: Props) {
  const selectedLang = useStore($selectedLanguage)
  const secondaryLangs = useStore($secondaryLanguages)
  const selectedLangs = useStore($selectedLanguages)
  const engIsExplicit = useStore($engIsExplicit)
  const chapterText = useStore($chapterText)
  const audioPlayState = useStore($audioPlayState)
  const currentVerseIdx = useStore($currentVerseIdx)
  const verseEntries = useStore($currentVerseEntries)
  const audioPageStory = useStore($audioPageStory)

  const thisPageStory = `${templateName}/${categoryId}/${storyId}`
  const isOnAudioPage = audioPageStory === thisPageStory
  // Map current verse entry index back to visual section index
  const playingSectionIdx = isOnAudioPage ? verseEntries[currentVerseIdx]?.sectionIndex ?? -1 : -1

  const [hydrated, setHydrated] = useState(false)
  const [markdown] = useState<string>(markdownContent)
  const [localeData, setLocaleData] = useState<Record<string, any> | null>(null)
  const [loading] = useState(false)
  const [error] = useState<string | null>(markdownContent ? null : "Story not found")
  const [audioWarning, setAudioWarning] = useState<string | null>(null)
  const [textWarning, setTextWarning] = useState<string | null>(null)
  const [audioLang, setAudioLang] = useState<string | null>(null)
  const audioSetupPromise = useRef<Promise<void> | null>(null)

  useEffect(() => setHydrated(true), [])

  // Register audio callbacks for image lookup (used by mini player)
  useEffect(() => {
    registerAudioCallbacks({
      findBestImage: (chapter: number, verse: number) => {
        const chapterImages = imageIndex?.[chapter]
        if (!chapterImages) return null
        const keys = Object.keys(chapterImages).map(Number).sort((a, b) => a - b)
        let bestKey = keys[0]
        for (const k of keys) {
          if (k <= verse) bestKey = k
          else break
        }
        const images = chapterImages[bestKey]
        const img = images?.[0]
        if (!img) return null
        if (img.startsWith("http://") || img.startsWith("https://")) return img
        return img.startsWith("/") ? img : `/templates/${templateName}/${img}`
      },
      imgProxy: (url: string, _w: number) => url,
    })
  }, [templateName, imageIndex])

  // Load locale data for current language from build-time data
  useEffect(() => {
    if (allLocales[selectedLang]) {
      setLocaleData(allLocales[selectedLang] as Record<string, any>)
    } else {
      setLocaleData(null)
    }
  }, [selectedLang, allLocales])

  // Load language data and chapter text for all active languages
  useEffect(() => {
    if (!markdown) return

    const loadAllLanguages = async () => {
      const tempSections = parseMarkdownIntoSections(markdown)
      const refs = new Set<string>()
      const neededTestaments = new Set<string>()
      for (const section of tempSections.sections) {
        if (section.reference) {
          for (const ref of splitReference(section.reference)) {
            const parsed = parseReference(ref)
            if (parsed) {
              refs.add(`${parsed.book}.${parsed.chapter}`)
              neededTestaments.add(getTestament(parsed.book))
            }
          }
        }
      }

      // Check if primary language has timed audio for required testaments
      const TIMING_CATS = ["with-timecode", "audio-with-timecode"]
      const primaryLangData = await loadLanguageData(selectedLangs[0])
      const primaryHasTimedAudio = primaryLangData
        && TIMING_CATS.includes(primaryLangData.category)
        && !(neededTestaments.has("ot") && primaryLangData.canon === "nt")

      if (primaryHasTimedAudio) {
        setAudioLang(selectedLangs[0])
        setAudioWarning(null)
      } else {
        // Look for a secondary language with timed audio
        await loadLanguageNames()
        let fallbackLang: string | null = null
        for (const lang of selectedLangs.slice(1)) {
          const langData = await loadLanguageData(lang)
          if (langData && TIMING_CATS.includes(langData.category)) {
            if (!neededTestaments.has("ot") || langData.canon !== "nt") {
              fallbackLang = lang
              break
            }
          }
        }

        if (fallbackLang) {
          setAudioLang(fallbackLang)
          const names = $languageNames.get()
          const fallbackName = names[fallbackLang]?.n || fallbackLang.toUpperCase()
          setAudioWarning(`No timed audio for primary language — using ${fallbackName} for audio`)
        } else {
          setAudioLang(null)
          setAudioWarning("No timed audio available — audio playback disabled")
        }
      }

      // Load text for all selected languages
      let primaryHasText = false
      for (const lang of selectedLangs) {
        const langData = await loadLanguageData(lang)
        if (!langData?.data) continue

        const textFilesetId = parseTextFilesetId(langData.data?.t, langData.distinctId)
        if (!textFilesetId) continue

        if (lang === selectedLangs[0]) primaryHasText = true

        for (const refKey of refs) {
          const [book, chapter] = refKey.split(".")
          await loadChapter(book, parseInt(chapter, 10), textFilesetId, lang)
        }
      }

      // If primary language has no text and English isn't already selected,
      // load English as fallback so the user sees some content
      if (!primaryHasText) {
        setTextWarning("No text available for this language — showing English")
        if (!engIsExplicit) {
          const engData = await loadLanguageData("eng")
          if (engData?.data) {
            const engTextId = parseTextFilesetId(engData.data?.t, engData.distinctId)
            if (engTextId) {
              for (const refKey of refs) {
                const [book, chapter] = refKey.split(".")
                await loadChapter(book, parseInt(chapter, 10), engTextId, "eng")
              }
            }
          }
        }
      } else {
        setTextWarning(null)
      }
    }
    loadAllLanguages()
  }, [markdown, selectedLangs.join(","), engIsExplicit])

  // Ensure audio context is set up (called on-demand before playing)
  const ensureAudioSetup = useCallback(async () => {
    if (!audioLang) return // Audio disabled — no language has timed audio
    if (audioSetupPromise.current) return audioSetupPromise.current

    audioSetupPromise.current = (async () => {
      const langData = await loadLanguageData(audioLang)
      if (!langData?.data) return

      const audioFilesetId = parseAudioFilesetId(langData.data?.a, langData.distinctId)
      if (!audioFilesetId) return

      const tempSections = parseMarkdownIntoSections(markdown)

      // Fetch timing data
      const timingData = await fetchTimingData(templateName, audioLang, langData.distinctId, langData.category)

      // Collect all unique book+chapter combinations from sections
      const chapterRefs = new Map<string, { book: string; chapter: number }>()
      for (const section of tempSections.sections) {
        if (!section.reference) continue
        for (const ref of splitReference(section.reference)) {
          const p = parseReference(ref)
          if (p) {
            const key = `${p.book}.${p.chapter}`
            if (!chapterRefs.has(key)) chapterRefs.set(key, { book: p.book, chapter: p.chapter })
          }
        }
      }

      // Fetch audio URLs for all chapters in parallel
      const audioUrlMap = new Map<string, string | null>()
      await Promise.all(
        [...chapterRefs.entries()].map(async ([key, { book, chapter }]) => {
          const url = await fetchAudioUrl(audioFilesetId, book, chapter)
          audioUrlMap.set(key, url)
        }),
      )

      // Build verse entries: expand multi-reference sections into separate entries
      // that share the same sectionIndex, so audio plays each reference sequentially
      // while the UI keeps the same section highlighted.
      const firstParsed = chapterRefs.values().next().value
      const verseEntries: import("../stores/audio-store").VerseEntry[] = []

      // Group split references by book+chapter for sequential playback
      for (let sectionIdx = 0; sectionIdx < tempSections.sections.length; sectionIdx++) {
        const section = tempSections.sections[sectionIdx]
        if (!section.reference) {
          verseEntries.push({
            verseStart: 0, verseEnd: 0, startTime: 0, endTime: 0,
            audioUrl: null, sectionIndex: sectionIdx,
          })
          continue
        }

        const refs = splitReference(section.reference)

        // Group consecutive refs that share the same book+chapter into one entry,
        // but create a new entry when the book+chapter changes.
        let currentChapterKey = ""
        let startTime = Infinity
        let endTime = 0
        let vs = 0
        let ve = 0

        for (const ref of refs) {
          const p = parseReference(ref)
          if (!p) continue
          const chapterKey = `${p.book}.${p.chapter}`

          if (chapterKey !== currentChapterKey && currentChapterKey !== "") {
            // Flush previous group as an entry
            verseEntries.push({
              verseStart: vs, verseEnd: ve,
              startTime: startTime === Infinity ? 0 : startTime,
              endTime,
              audioUrl: audioUrlMap.get(currentChapterKey) || null,
              sectionIndex: sectionIdx,
            })
            startTime = Infinity
            endTime = 0
            vs = 0
            ve = 0
          }

          currentChapterKey = chapterKey
          const timing = findTimingForReference(timingData, audioFilesetId, ref)
          if (timing) {
            startTime = Math.min(startTime, timing.startTime)
            endTime = Math.max(endTime, timing.endTime)
          }
          if (!vs) { vs = p.verseStart || 1; ve = p.verseEnd || vs }
          else { ve = p.verseEnd || p.verseStart || ve }
        }

        // Flush last group
        if (currentChapterKey) {
          verseEntries.push({
            verseStart: vs, verseEnd: ve,
            startTime: startTime === Infinity ? 0 : startTime,
            endTime,
            audioUrl: audioUrlMap.get(currentChapterKey) || null,
            sectionIndex: sectionIdx,
          })
        } else {
          verseEntries.push({
            verseStart: 0, verseEnd: 0, startTime: 0, endTime: 0,
            audioUrl: null, sectionIndex: sectionIdx,
          })
        }
      }

      const primaryUrl = verseEntries.find((e) => e.audioUrl)?.audioUrl || null

      setAudioForChapter({
        distinctId: langData.distinctId || "",
        bookCode: firstParsed?.book || "",
        chapter: firstParsed?.chapter || 0,
        bookName: templateName,
        audioUrl: primaryUrl,
        verseEntries,
      })
    })()

    return audioSetupPromise.current
  }, [audioLang, templateName, markdown])

  // Reset audio setup when audio language or content changes
  useEffect(() => {
    audioSetupPromise.current = null
  }, [audioLang, templateName, markdown])

  // Build sections map per language
  const sectionsMap: Record<string, Section[]> = {}
  // Determine which languages to render text for (including eng fallback)
  const langsToRender = [...selectedLangs]
  const primaryHasText = Object.keys(chapterText).some((k) => k.startsWith(`${selectedLangs[0]}-`))
  if (!primaryHasText && !engIsExplicit) {
    const engHasText = Object.keys(chapterText).some((k) => k.startsWith("eng-"))
    if (engHasText) langsToRender.push("eng")
  }
  for (const lang of langsToRender) {
    const langChapterText: Record<string, any> = {}
    for (const [key, value] of Object.entries(chapterText)) {
      if (key.startsWith(`${lang}-`)) {
        langChapterText[key.replace(`${lang}-`, "")] = value
      }
    }
    const parsed = parseMarkdownIntoSections(markdown, langChapterText, localeData)
    sectionsMap[lang] = parsed.sections
  }

  const primaryParsed = parseMarkdownIntoSections(markdown, {}, localeData)
  const storyTitle = primaryParsed.title || `Story ${storyId}`

  const handleSectionClick = (sectionIndex: number) => {
    if (!audioLang) return // Audio disabled
    unlockAudio()
    $audioPageStory.set(`${templateName}/${categoryId}/${storyId}`)
    // Ensure focus mode activates even if already true
    if ($focusMode.get()) {
      window.dispatchEvent(new CustomEvent("focus-panel-refresh", { detail: { idx: sectionIndex } }))
    } else {
      $focusMode.set(true)
    }
    ensureAudioSetup().then(() => {
      // Find the first verse entry for this visual section
      const entries = $currentVerseEntries.get()
      const entryIdx = entries.findIndex(
        (e) => e.sectionIndex === sectionIndex && e.endTime > e.startTime,
      )
      if (entryIdx >= 0) {
        playVerse(entryIdx)
      }
      if ($focusMode.get()) {
        requestAnimationFrame(() => {
          if ($focusMode.get()) {
            window.dispatchEvent(new CustomEvent("focus-panel-refresh", { detail: { idx: sectionIndex } }))
          }
        })
      }
    })
  }

  const backHref = hydrated
    ? buildLangHref(selectedLang, `${templateName}/`, secondaryLangs)
    : `/${templateName}/`

  if (loading) {
    return (
      <div>
        <div className="mb-4">
          <a href={backHref} className="text-primary hover:text-primary-light text-sm">&larr;</a>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading story...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <div className="mb-4">
          <a href={backHref} className="text-primary hover:text-primary-light text-sm">&larr;</a>
        </div>
        <div className="text-center py-12">
          <h2 className="text-lg font-semibold text-red-600 mb-2">Story Not Available</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  const primarySections = sectionsMap[selectedLang] || primaryParsed.sections

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <a
          href={backHref}
          className="text-primary hover:text-primary-light text-sm"
        >
          &larr;
        </a>
        <h1 className="text-xl font-bold">{storyTitle}</h1>
      </div>

      {audioWarning && (
        <div className="mb-4 px-3 py-2 rounded-md bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 text-sm">
          {audioWarning}
        </div>
      )}

      {textWarning && (
        <div className="mb-4 px-3 py-2 rounded-md bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200 text-sm">
          {textWarning}
        </div>
      )}

      <div className="space-y-4">
        {primarySections.map((section, index) => (
          <StorySection
            key={index}
            section={section}
            sectionIndex={index}
            selectedLanguages={langsToRender}
            sectionsMap={sectionsMap}
            isPlaying={isOnAudioPage && audioPlayState !== "idle" && playingSectionIdx === index}
            onSectionClick={handleSectionClick}
          />
        ))}
      </div>
    </div>
  )
}

// --- Helpers ---

async function fetchTimingData(
  templateName: string,
  langCode: string,
  distinctId: string,
  category: string,
): Promise<Record<string, any> | null> {
  const categories = category === "with-timecode"
    ? ["with-timecode"]
    : ["with-timecode", "audio-with-timecode"]
  for (const cat of categories) {
    const url = `/templates/${templateName}/ALL-timings/nt/${cat}/${langCode}/${distinctId}/timing.json`
    try {
      const resp = await fetch(url)
      if (!resp.ok) continue
      return await resp.json()
    } catch {
      continue
    }
  }
  return null
}

/**
 * Search all story entries in timing data for a matching Bible reference.
 * Timing data is keyed by fileset ID → story number → "BOOK#:SPEC" → timestamps.
 * This mirrors the previous app's extractRawTimingData approach.
 */
function findTimingForReference(
  timingData: Record<string, any> | null,
  audioFilesetId: string,
  reference: string,
): { startTime: number; endTime: number } | null {
  if (!timingData) return null

  const parsed = parseReference(reference)
  if (!parsed) return null

  // Build the key format used in timing data: "BOOK#:SPEC" (no space)
  const vs = parsed.verseStart
  const ve = parsed.verseEnd
  const searchRef = vs
    ? `${parsed.book}${parsed.chapter}:${vs}${ve && ve !== vs ? `-${ve}` : ""}`
    : null
  if (!searchRef) return null

  // Search through all fileset keys, then all story entries
  for (const key of Object.keys(timingData)) {
    if (key === "warnings") continue
    const filesetData = timingData[key]
    if (!filesetData) continue

    for (const storyData of Object.values(filesetData) as Record<string, number[]>[]) {
      if (storyData[searchRef]) {
        const timestamps = storyData[searchRef]
        return { startTime: timestamps[0], endTime: timestamps[timestamps.length - 1] }
      }
    }
  }
  return null
}

async function fetchAudioUrl(
  audioFilesetId: string,
  bookCode: string,
  chapter: number,
): Promise<string | null> {
  const params = new URLSearchParams({
    type: "audio",
    fileset_id: audioFilesetId,
    book_id: bookCode,
    chapter_id: String(chapter),
  })
  try {
    const resp = await fetch(`/.netlify/functions/dbt-proxy?${params}`)
    if (!resp.ok) return null
    const json = await resp.json()
    return json.data?.[0]?.path || null
  } catch {
    return null
  }
}

