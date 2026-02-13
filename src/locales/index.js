// Locale exports and configuration
import en from "./en.js";
import fr from "./fr.js";
import de from "./de.js";
import es from "./es.js";
import pt from "./pt.js";
import ru from "./ru.js";
import hi from "./hi.js";
import ar from "./ar.js";
import ro from "./ro.js";

// Available locales
export const locales = {
  en,
  fr,
  de,
  es,
  pt,
  ru,
  hi,
  ar,
  ro,
};

// Default locale
export const defaultLocale = "en";

// Get locale strings for a given language code
export const getLocale = (langCode) => {
  // Map common language codes to UI locales
  const localeMap = {
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
  };

  const mappedCode = localeMap[langCode] || defaultLocale;
  return locales[mappedCode] || locales[defaultLocale];
};

export default locales;
