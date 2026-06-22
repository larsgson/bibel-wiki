import fs from "node:fs"
import path from "node:path"

const LANG_DATA_DIR = path.join(process.cwd(), "public/ALL-langs-data")

const LANG_MAP: Record<string, string> = {
  es: "spa",
  en: "eng",
  fr: "fra",
  de: "deu",
  pt: "por",
  ru: "rus",
  hi: "hin",
  ar: "arb",
  ro: "ron",
  ca: "cat",
  eu: "eus",
  ast: "ast",
}

export function bcp47ToIso639_3(bcp47: string): string {
  return LANG_MAP[bcp47] || bcp47
}

export function parseTextFilesetId(
  tField: string | undefined,
  distinctId: string,
): string {
  if (!tField) return ""
  let raw = tField
  if (raw.endsWith(".txt")) {
    raw = raw.slice(0, -4)
  }
  if (raw.length < 6) {
    raw = distinctId + raw
  }
  if (raw.endsWith("_ET")) {
    raw = raw.slice(0, -3)
  }
  return raw
}

export function parseAudioFilesetId(
  aField: string | undefined,
  distinctId: string,
): string {
  if (!aField) return ""
  let raw = aField
  if (raw.endsWith(".mp3")) {
    raw = raw.slice(0, -4)
  }
  if (raw.length < 6) {
    raw = distinctId + raw
  }
  return raw
}

const CATEGORY_PRIORITY = [
  "with-timecode",
  "audio-with-timecode",
  "syncable",
  "text-only",
  "audio-only",
]

export function resolveFilesets(
  distinctId: string,
  iso3Code: string,
): { textFilesetId: string; audioFilesetId: string } {
  let textFilesetId = ""
  let audioFilesetId = ""

  for (const canon of ["nt", "ot"]) {
    for (const cat of CATEGORY_PRIORITY) {
      const dataPath = path.join(
        LANG_DATA_DIR,
        canon,
        cat,
        iso3Code,
        distinctId,
        "data.json",
      )
      try {
        if (fs.existsSync(dataPath)) {
          const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"))
          if (!textFilesetId && data.t) {
            textFilesetId = parseTextFilesetId(data.t, distinctId)
          }
          if (!audioFilesetId && data.a) {
            audioFilesetId = parseAudioFilesetId(data.a, distinctId)
          }
        }
      } catch {
        // continue to next category
      }
      if (textFilesetId && audioFilesetId) break
    }
    if (textFilesetId && audioFilesetId) break
  }

  return { textFilesetId, audioFilesetId }
}
