import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { useStore } from "@nanostores/react"
import {
  $selectedLanguage,
  $secondaryLanguages,
  setLanguage,
  addSecondaryLanguage,
  removeSecondaryLanguage,
  clearSecondaryLanguages,
} from "../stores/language-store"
import { t, resolveUILang } from "../lib/ui-locales"

interface Language {
  code: string
  english: string
  vernacular: string
  category: string
}

interface Props {
  mode: "primary" | "secondary"
  onClose: () => void
}

// 7 most spoken languages by number of speakers (ISO 639-3 codes used in DBT)
const QUICK_PICK_CODES = ["eng", "cmn", "hin", "spa", "arb", "fra", "por"]

const RECENT_KEY = "bibel-wiki-recent-langs"
const MAX_RECENTS = 5

function getRecentLangs(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_KEY)
    return stored ? JSON.parse(stored) : []
  } catch { return [] }
}

function addRecentLang(code: string) {
  try {
    const recents = getRecentLangs().filter((c) => c !== code)
    recents.unshift(code)
    localStorage.setItem(RECENT_KEY, JSON.stringify(recents.slice(0, MAX_RECENTS)))
  } catch { /* ignore */ }
}

/** Wrap matching substring in <mark> tags */
function highlightMatch(text: string, search: string) {
  if (!search) return text
  const idx = text.toLowerCase().indexOf(search.toLowerCase())
  if (idx < 0) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 rounded-sm px-0.5">{text.slice(idx, idx + search.length)}</mark>
      {text.slice(idx + search.length)}
    </>
  )
}

export default function LanguageSelectorIsland({ mode, onClose }: Props) {
  const selectedLang = useStore($selectedLanguage)
  const secondaryLangs = useStore($secondaryLanguages)
  const [searchTerm, setSearchTerm] = useState("")
  const [languages, setLanguages] = useState<Language[]>([])
  const [loading, setLoading] = useState(true)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const [recentCodes] = useState(() => getRecentLangs())
  const listRef = useRef<HTMLDivElement>(null)
  const uiLang = resolveUILang(selectedLang, secondaryLangs)

  useEffect(() => {
    fetch("/ALL-langs-compact.json")
      .then((r) => r.json())
      .then((data) => {
        const langList: Language[] = []
        if (data.canons?.nt) {
          for (const [category, categoryData] of Object.entries(data.canons.nt) as any[]) {
            for (const [code, lang] of Object.entries(categoryData) as any[]) {
              if (!langList.find((l) => l.code === code)) {
                langList.push({
                  code,
                  english: lang.n,
                  vernacular: lang.v || lang.n,
                  category,
                })
              }
            }
          }
        }
        langList.sort((a, b) => a.english.localeCompare(b.english))
        setLanguages(langList)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Quick picks: recent languages first, then top spoken languages (only those available)
  const quickPicks = useMemo(() => {
    if (!languages.length) return []
    const picks: Language[] = []
    const added = new Set<string>()
    const excludeCode = mode === "primary" ? null : selectedLang

    // Add recents first
    for (const code of recentCodes) {
      if (code === excludeCode) continue
      const lang = languages.find((l) => l.code === code)
      if (lang && !added.has(code)) {
        picks.push(lang)
        added.add(code)
      }
    }

    // Fill with top spoken languages
    for (const code of QUICK_PICK_CODES) {
      if (code === excludeCode) continue
      if (added.has(code)) continue
      const lang = languages.find((l) => l.code === code)
      if (lang) {
        picks.push(lang)
        added.add(code)
      }
    }

    return picks.slice(0, 7)
  }, [languages, recentCodes, mode, selectedLang])

  // Only show search results after 2+ characters
  const searchResults = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()
    if (search.length < 2) return []
    const excludeCode = mode === "primary" ? null : selectedLang
    return languages
      .filter((l) => l.code !== excludeCode)
      .filter(
        (l) =>
          l.english.toLowerCase().includes(search) ||
          l.vernacular.toLowerCase().includes(search) ||
          l.code.toLowerCase().includes(search),
      )
  }, [languages, searchTerm, mode, selectedLang])

  // Reset highlight when results change
  useEffect(() => {
    setHighlightIdx(searchResults.length > 0 ? 0 : -1)
  }, [searchResults.length])

  const handleSelect = useCallback((lang: Language) => {
    addRecentLang(lang.code)
    if (mode === "primary") {
      setLanguage(lang.code)
      onClose()
    } else {
      if (secondaryLangs.includes(lang.code)) {
        removeSecondaryLanguage(lang.code)
      } else {
        addSecondaryLanguage(lang.code)
      }
    }
  }, [mode, secondaryLangs, onClose])

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIdx < 0 || !listRef.current) return
    const el = listRef.current.querySelector(`[data-idx="${highlightIdx}"]`)
    if (el) el.scrollIntoView({ block: "nearest" })
  }, [highlightIdx])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const len = searchResults.length
    if (!len) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlightIdx((i) => (i + 1) % len)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightIdx((i) => (i <= 0 ? len - 1 : i - 1))
    } else if (e.key === "Enter" && highlightIdx >= 0 && highlightIdx < len) {
      e.preventDefault()
      handleSelect(searchResults[highlightIdx])
    } else if (e.key === "Escape") {
      e.preventDefault()
      onClose()
    }
  }, [searchResults, highlightIdx, handleSelect, onClose])

  const isSelected = (code: string) => {
    if (mode === "primary") return code === selectedLang
    return secondaryLangs.includes(code)
  }

  const search = searchTerm.trim()
  const showResults = search.length >= 2

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white text-gray-900 rounded-lg w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === "primary" ? t(uiLang, "languageSelector.title") : t(uiLang, "languageSelector.selectSecondaryLanguages")}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Quick picks */}
        {!showResults && quickPicks.length > 0 && (
          <div className="p-3 flex flex-wrap gap-2">
            {quickPicks.map((lang) => {
              const selected = isSelected(lang.code)
              return (
                <button
                  key={lang.code}
                  onClick={() => handleSelect(lang)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    selected
                      ? "bg-blue-100 border-blue-400 text-blue-800 font-semibold"
                      : "bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {lang.english}
                  {selected && " \u2713"}
                </button>
              )
            })}
          </div>
        )}

        {/* Search input */}
        <div className="px-3 pb-3">
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder={t(uiLang, "languageSelector.typeLangName")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          {search.length === 1 && (
            <div className="text-xs text-gray-400 mt-1 px-1">{t(uiLang, "languageSelector.typeOneMore")}</div>
          )}
        </div>

        {/* Search results */}
        {showResults && (
          <div className="flex-1 overflow-y-auto px-3 pb-3" ref={listRef}>
            {mode === "secondary" && secondaryLangs.length > 0 && (
              <button
                onClick={() => { clearSecondaryLanguages(); onClose() }}
                className="w-full text-left px-3 py-2 rounded-md mb-1 text-gray-700 hover:bg-gray-100"
              >
                <em>{t(uiLang, "languageSelector.clearAll")}</em>
              </button>
            )}
            {searchResults.map((lang, idx) => {
              const selected = isSelected(lang.code)
              const highlighted = idx === highlightIdx
              return (
                <button
                  key={lang.code}
                  data-idx={idx}
                  onClick={() => handleSelect(lang)}
                  onMouseEnter={() => setHighlightIdx(idx)}
                  className={`w-full text-left px-3 py-2 rounded-md mb-1 flex items-center gap-2 text-gray-900 ${
                    highlighted ? "bg-blue-50" : "hover:bg-gray-100"
                  } ${selected ? "font-semibold" : ""}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="truncate">
                      {highlightMatch(lang.english, search)}
                      {selected && " \u2713"}
                    </div>
                    {lang.vernacular !== lang.english && (
                      <div className="text-sm text-gray-500 truncate">
                        {highlightMatch(lang.vernacular, search)}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {highlightMatch(lang.code, search)}
                  </span>
                </button>
              )
            })}
            {searchResults.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                {t(uiLang, "languageSelector.noLangsFound")} &ldquo;{searchTerm}&rdquo;
              </div>
            )}
          </div>
        )}

        <div className="p-3 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-gray-200 rounded-md hover:bg-gray-300 text-gray-800"
          >
            {mode === "secondary" ? t(uiLang, "languageSelector.done") : t(uiLang, "languageSelector.close")}
          </button>
        </div>
      </div>
    </div>
  )
}
