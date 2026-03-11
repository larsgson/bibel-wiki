import { en } from "../locales/en"
import { fr } from "../locales/fr"
import { de } from "../locales/de"
import { es } from "../locales/es"
import { pt } from "../locales/pt"
import { ru } from "../locales/ru"
import { hi } from "../locales/hi"
import { ar } from "../locales/ar"
import { ro } from "../locales/ro"

const locales: Record<string, any> = { en, fr, de, es, pt, ru, hi, ar, ro }
const defaultLocale = "en"

const localeMap: Record<string, string> = {
  eng: "en",
  fra: "fr",
  deu: "de",
  spa: "es",
  por: "pt",
  rus: "ru",
  hin: "hi",
  arb: "ar",
  ron: "ro",
  en: "en",
  fr: "fr",
  de: "de",
  es: "es",
  pt: "pt",
  ru: "ru",
  hi: "hi",
  ar: "ar",
  ro: "ro",
}

export function getLocale(langCode: string): any {
  const mappedCode = localeMap[langCode] || defaultLocale
  return locales[mappedCode] || locales[defaultLocale]
}

export function t(langCode: string, path: string): string {
  const locale = getLocale(langCode)
  const keys = path.split(".")
  let value: any = locale
  for (const key of keys) {
    if (value == null) return path
    value = value[key]
  }
  return typeof value === "string" ? value : path
}
