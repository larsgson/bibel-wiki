import {engLangNames} from './engLangNames';

export const lang2to3letters = {
  as: "asm",
  bn: "ben",
  en: "eng",
  es: "spa",
  gu: "guj",
  he: "hbo",
  hi: "hin",
  kn: "kan",
  ml: "mal",
  mr: "mar",
  ne: "nep",
  pu: "pan",
  ta: "tam",
  te: "tel",
  ur: "urd",
}

export const langName = {
  as: "অসমীয়া", 
  bgl: "Baghlayani", 
  bn: "বাঙালি", 
  kfs: "बिलासपुरी", 
  boc: "Bommala", 
  dgo: "डोगरी", 
  dom: "Dommri", 
  en: "English", 
  gu: "ગુજરાતી", 
  har: "हरियाणवी", 
  hi: "हिंदी", 
  kar: "कच्छ",
  kn: "ಕನ್ನಡ", 
  gjk: "કોલી કચ્છી", 
  kon: "Kongaru", 
  ml: "മലയാളം", 
  mr: "मराठी", 
  may: "मायला मराठी", 
  nag: "Nagamese", 
  ne: "नेपाली", 
  ory: "ଓଡିଆ", 
  pu: "ਪੰਜਾਬੀ", 
  ta: "தமிழ்", 
  te: "తెలుగు", 
  ur: "उर्दू", 
  vav: "વારલી"
}

export const navLangList = [ "en", "hi", "kn", "ml" ]

export const extraEngLangName = {
  as: "Assamese",
  bgl: "Baghlayani", 
  bn: "Bengali",
  kfs: "Bilaspuri", 
  boc: "Bommala", 
  dgo: "Dogri", 
  dom: "Dommri", 
  har: "Haryanvi",
  kar: "Kachha",
  kn: "Kannada",
  gjk: "Koli-Kachhi", 
  kon: "Kongaru", 
  may: "Mayla-Marathi",
  nag: "Nagamese", 
  ory: "Odia",
  pu: "Punjabi",
  vav: "Varli-Davri"
}


export const getEngLangName = (lang) => {
  return extraEngLangName[lang] || engLangNames.main.en.localeDisplayNames.languages[lang]
}
