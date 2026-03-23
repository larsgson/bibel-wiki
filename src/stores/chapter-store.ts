import { atom } from "nanostores"
import {
  loadContribText,
  fetchHelloaoText,
  fetchDbtText,
  getHelloaoTid,
} from "../lib/content-sources"

// Cache key: "langCode-BOOK.chapter" e.g. "spa-JHN.1"
export const $chapterText = atom<Record<string, any>>({})

// Contrib registry: lang → contribId (e.g. "nor" → "NBS")
const contribRegistry: Record<string, string> = {
  nor: "NBS",
}

export async function loadChapter(
  book: string,
  chapter: number,
  filesetId: string,
  langCode: string,
): Promise<any> {
  const cacheKey = `${langCode}-${book}.${chapter}`
  const existing = $chapterText.get()
  if (existing[cacheKey]) return existing[cacheKey]

  let verses: any = null

  // 1. Try contrib (local files)
  const contribId = contribRegistry[langCode]
  if (contribId) {
    verses = loadContribText(langCode, contribId, book, chapter)
  }

  // 2. Try helloao (free API, no key needed)
  if (!verses) {
    // Derive distinct_id from filesetId by stripping audio suffix patterns
    const distinctId = filesetId.replace(/(N[12]DA|[A-Z]{2}16|O[12]DA|S[12]DA)$/, "")
    const tid = getHelloaoTid(distinctId)
    if (tid) {
      verses = await fetchHelloaoText(tid, book, chapter)
    }
  }

  // 3. Fall back to DBT proxy
  if (!verses) {
    verses = await fetchDbtText(filesetId, book, chapter)
  }

  if (verses) {
    $chapterText.set({ ...existing, [cacheKey]: verses })
  }

  return verses
}

export function getChapterData(
  book: string,
  chapter: number,
  langCode: string,
): any {
  const cacheKey = `${langCode}-${book}.${chapter}`
  return $chapterText.get()[cacheKey] || null
}
