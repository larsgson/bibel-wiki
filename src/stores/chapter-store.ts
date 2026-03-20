import { atom } from "nanostores"

// Cache key: "langCode-BOOK.chapter" e.g. "spa-JHN.1"
export const $chapterText = atom<Record<string, any>>({})

const PROXY_URL = "/.netlify/functions/dbt-proxy"

export async function loadChapter(
  book: string,
  chapter: number,
  filesetId: string,
  langCode: string,
): Promise<any> {
  const cacheKey = `${langCode}-${book}.${chapter}`
  const existing = $chapterText.get()
  if (existing[cacheKey]) return existing[cacheKey]

  try {
    const url = `${PROXY_URL}?type=text&fileset_id=${filesetId}&book_id=${book}&chapter_id=${chapter}`
    const resp = await fetch(url)
    if (!resp.ok) return null

    const json = await resp.json()
    // DBT API v4 returns { data: [...] } or direct array
    // Each item: { book_id, chapter, verse_start, verse_text, ... }
    const rawData = Array.isArray(json) ? json : (json.data || json)
    const verses = Array.isArray(rawData)
      ? rawData.map((v: any) => ({
          num: parseInt(v.verse_start || v.verse_end || "0", 10),
          text: v.verse_text || "",
        }))
      : rawData

    $chapterText.set({ ...existing, [cacheKey]: verses })
    return verses
  } catch (e) {
    console.warn(`Failed to load chapter ${book} ${chapter}:`, e)
    return null
  }
}

export function getChapterData(
  book: string,
  chapter: number,
  langCode: string,
): any {
  const cacheKey = `${langCode}-${book}.${chapter}`
  return $chapterText.get()[cacheKey] || null
}
