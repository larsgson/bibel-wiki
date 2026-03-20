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

const CATEGORY_COLORS: Record<string, string> = {
  "with-timecode": "#28a745",
  "audio-with-timecode": "#28a745",
  syncable: "#17a2b8",
  "audio-only": "#ffc107",
  "text-only": "#6c757d",
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
  const listRef = useRef<HTMLDivElement>(null)

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

  const filteredLanguages = useMemo(() => {
    const excludeCode = mode === "primary" ? null : selectedLang
    let filtered = excludeCode ? languages.filter((l) => l.code !== excludeCode) : languages
    if (!searchTerm.trim()) return filtered
    const search = searchTerm.toLowerCase()
    return filtered.filter(
      (l) =>
        l.english.toLowerCase().includes(search) ||
        l.vernacular.toLowerCase().includes(search) ||
        l.code.toLowerCase().includes(search),
    )
  }, [languages, searchTerm, mode, selectedLang])

  // Reset highlight when filtered list changes
  useEffect(() => {
    setHighlightIdx(searchTerm ? 0 : -1)
  }, [filteredLanguages.length, searchTerm])

  const handleSelect = useCallback((lang: Language) => {
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
    const len = filteredLanguages.length
    if (!len) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlightIdx((i) => (i + 1) % len)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightIdx((i) => (i <= 0 ? len - 1 : i - 1))
    } else if (e.key === "Enter" && highlightIdx >= 0 && highlightIdx < len) {
      e.preventDefault()
      handleSelect(filteredLanguages[highlightIdx])
    } else if (e.key === "Escape") {
      e.preventDefault()
      onClose()
    }
  }, [filteredLanguages, highlightIdx, handleSelect, onClose])

  const isSelected = (code: string) => {
    if (mode === "primary") return code === selectedLang
    return secondaryLangs.includes(code)
  }

  const search = searchTerm.trim()

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
            {mode === "primary" ? "Select Language" : "Select Secondary Languages"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="p-3">
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Search by language name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3" ref={listRef}>
          {loading ? (
            <div className="text-center py-4 text-gray-500">Loading languages...</div>
          ) : (
            <>
              {mode === "secondary" && secondaryLangs.length > 0 && !searchTerm && (
                <button
                  onClick={() => { clearSecondaryLanguages(); onClose() }}
                  className="w-full text-left px-3 py-2 rounded-md mb-1 text-gray-700 hover:bg-gray-100"
                >
                  <em>Clear all</em>
                </button>
              )}
              {filteredLanguages.map((lang, idx) => {
                const selected = isSelected(lang.code)
                const highlighted = idx === highlightIdx
                return (
                  <button
                    key={lang.code}
                    data-idx={idx}
                    onClick={() => handleSelect(lang)}
                    onMouseEnter={() => setHighlightIdx(idx)}
                    className={`w-full text-left px-3 py-2 rounded-md mb-1 flex items-center gap-2 text-gray-900 ${
                      highlighted
                        ? "bg-blue-50"
                        : "hover:bg-gray-100"
                    } ${selected ? "font-semibold" : ""}`}
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: CATEGORY_COLORS[lang.category] || "#6c757d" }}
                      title={lang.category}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="truncate">
                        {search ? highlightMatch(lang.english, search) : lang.english}
                        {selected && " \u2713"}
                      </div>
                      {lang.vernacular !== lang.english && (
                        <div className="text-sm text-gray-500 truncate">
                          {search ? highlightMatch(lang.vernacular, search) : lang.vernacular}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {search ? highlightMatch(lang.code, search) : lang.code}
                    </span>
                  </button>
                )
              })}
              {filteredLanguages.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No languages found for &ldquo;{searchTerm}&rdquo;
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-3 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-gray-200 rounded-md hover:bg-gray-300 text-gray-800"
          >
            {mode === "secondary" ? "Done" : "Close"}
          </button>
        </div>
      </div>
    </div>
  )
}
