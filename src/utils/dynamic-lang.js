import { obsStoryList } from '../constants/obsHierarchy'
import { fullBibleList, newTestamentList } from '../constants/bibleData'
import { lang2to3letters } from '../constants/languages'
import { gospelOfJohnObj, gospelOfJohnPlanObj } from '../constants/naviChaptersJohn'
import { 
 bibleDataEN, 
 bibleDataDE_ML_1912,
 bibleDataES_WP,
 bibleDataFR_WP,
 bibleDataHU_WP,
 bibleDataLU_WP,
 bibleDataRO_WP,
 bibleDataPT_BR_WP
} from '../constants/bibleData'

const bibleDataEnOBSStory = {
  freeType: false,
  curPath: "",
  title: "Open Bible Stories",
  description: "",
  image: {
      origin: "Local",
      filename: ""
  },
  language: "en",
  langID: "en",
  mediaType: "audio",
  episodeList: obsStoryList,
  uniqueID: "uW.OBS.en"
}

export const langVersion = {
  as: "irv", 
  bn: "irv", 
  en: "esv", 
  gu: "irv", 
  har: "hb", 
  hi: "irv", 
  kn: "irv", 
  ml: "irv", 
  mr: "irv", 
  ne: "ulb", 
  ory: "irv", 
  pu: "irv", 
  ta: "irv", 
  te: "irv", 
  ur: "irv", 
}

export const selectAudioBible = (lang) => 
lang === "en" 
  ? "en-audio-bible-WEB" 
  : lang === "es" 
  ? "es-audio-bible-WordProject" 
  : lang === "fr" 
  ? "fr-audio-bible-WordProject" 
  : lang === "hu" 
  ? "hu-audio-bible-WordProject" 
  : lang === "lu" 
  ? "lu-audio-bible-WordProject" 
  : lang === "ro" 
  ? "ro-audio-bible-WordProject" 
  : lang === "es" 
  ? "es-audio-bible-WordProject" 
  : lang === "de" 
  ? "de-audio-bible-ML"
  : `audio-bible-bb-project-${lang}` 

export const limitToNT = [ "xyz" ] // To Do - get this info from Bible Brain

export const navLangList = [ "en", "es"]

export const getSerie = (lang,serId) => {
  const checkObj = {
    "en-jhn-plan": gospelOfJohnPlanObj,
    "es-jhn-plan": gospelOfJohnPlanObj,
    "en-jhn-serie": gospelOfJohnObj,
    "es-jhn-serie": gospelOfJohnObj,
    "en-audio-OBS": bibleDataEnOBSStory,
  "de-jhn-serie": gospelOfJohnObj,
  "de-audio-bible-ML": bibleDataDE_ML_1912,
  "en-audio-bible-WEB": bibleDataEN,
  "es-audio-bible-WordProject": bibleDataES_WP,
  "pt-br-audio-bible-WordProject": bibleDataPT_BR_WP,
  "fr-audio-bible-WordProject": bibleDataFR_WP,
  "hu-audio-bible-WordProject": bibleDataHU_WP,
  "lu-audio-bible-WordProject": bibleDataLU_WP,
  "ro-audio-bible-WordProject": bibleDataRO_WP,
  }
  const is3LetterLang = (lang.length > 2)
  const curLang = is3LetterLang ? lang : lang2to3letters[lang]
  if (checkObj[serId]) return checkObj[serId]
  else if (lang === "es") {
    return {
      "bibleBookList": fullBibleList,
      "wordProjectType": true,
      "curPath": "https://storage.googleapis.com/audio.bibel.wiki/wp/6/", // or http://audio.bibel.wiki/wp/6/
      "title": "Audio Biblia",
      uniqueID: "WordProject.ES",
      "description": "Public domain",
      "language": "es",
      langID: "es",
      "mediaType": "bible",
      "image": {
         "origin": "Local",
         "filename": "pics/Bible_OT.png"
      }
    }
  } else if (lang !== "en") {
    return {
      bibleBookList: newTestamentList,
      bbProjectType: true,
      title: "Audio Biblia",
      uniqueID: `BibleBrainProject.${lang}`,
      description: "Public domain",
      language: lang,
      langID: lang,
      mediaType: "bible",
      image: {
         origin: "Local",
         filename: "pics/Bible_OT.png"
      }
   }   
  } else {
    const useVersion = langVersion[lang]
    const usePath = "https://vachan.sgp1.cdn.digitaloceanspaces.com/audio_bibles/"
    let curPath = ""
    if (useVersion) {
      curPath = `${usePath}${curLang}/${useVersion}/` 
    } else {
      curPath = `${usePath}${curLang}/`
    }
    const useLimitedList = limitToNT.includes(lang)
    const vachanServerType = (lang === "en")
    return {
      bibleBookList: useLimitedList ? newTestamentList : fullBibleList,
      vachanServerType,
      curPath,
      title: "Audio Bibel",
      uniqueID: `Vachan-${lang}`,
      description: "Public domain",
      language: lang,
      langID: lang,
      mediaType: "bible",
      image: {
        origin: "Local",
        filename: "pics/Bible_OT.png"
      }
    }
  }
}

export const serieLang = (id) => {
  const checkSpecialId = "audio-bible-bb-project-"
  if (id?.indexOf(checkSpecialId) === 0) {
    const curLangId = id.substring(checkSpecialId.length,id.length)
    return curLangId || "eng"
  } else {
    const checkObj = {
      "de-audio-bible-ML": "ger",
      "en-audio-bible-WEB": "eng",
      "es-audio-bible-WordProject": "spa",
      "pt-br-audio-bible-WordProject": "por",
      "fr-audio-bible-WordProject": "fra",
      "hu-audio-bible-WordProject": "hun",
      "lu-audio-bible-WordProject": "lub",
      "ro-audio-bible-WordProject": "ron",
      "de-jhn-serie": "ger",
      "en-jhn-serie": "eng",
      "es-jhn-serie": "spa",
      "de-jhn-plan": "ger",
      "en-jhn-plan": "eng",
      "es-jhn-plan": "spa",
      "en-audio-OBS": "eng",
    }
    return checkObj[id] || "eng"
  }
}

export const serieNavLang = (id) => {
  const checkSpecialId = "audio-bible-bb-project-"
  if (id?.indexOf(checkSpecialId) === 0) {
    const curLangId = id.substring(checkSpecialId.length,id.length)
    const adaptLangObj = {
      "spa": "es",
      "eng": "en",
      "esp": "es",
      "por": "pt-br",
      "fra": "fr",
      "deu": "de",
      "ger": "de",
    }
    return adaptLangObj[curLangId] || "en"
  } else {
    const checkObj = {
      "de-audio-bible-ML": "de",
      "en-audio-bible-WEB": "en",
      "es-audio-bible-WordProject": "es",
      "pt-br-audio-bible-WordProject": "pt-br",
      "fr-audio-bible-WordProject": "fr",
      "de-jhn-serie": "de",
      "en-jhn-serie": "en",
      "es-jhn-serie": "es",
      "de-jhn-plan": "de",
      "en-jhn-plan": "en",
      "es-jhn-plan": "es",
      "en-audio-OBS": "en",
    }
    return checkObj[id] || "en"
  }
}

export const serieNaviType =(id) => {
  const checkObj = {
    "en-audio-bible-WEB": "audioBible",
    "en-jhn-serie": "videoSerie",
    "es-jhn-serie": "videoSerie",
    "en-jhn-plan": "videoPlan",
    "es-jhn-plan": "videoPlan",
    "en-audio-OBS": "audioStories",
  "de-audio-bible-ML": "audioBible",
  "es-audio-bible-WordProject": "audioBible",
  "pt-br-audio-bible-WordProject": "audioBible",
  "fr-audio-bible-WordProject": "audioBible",
  "hu-audio-bible-WordProject": "audioBible",
  "lu-audio-bible-WordProject": "audioBible",
  "ro-audio-bible-WordProject": "audioBible",
  "de-jhn-serie": "videoSerie",
  "de-jhn-plan": "videoPlan",
  }
  return checkObj[id] || "audioBible"
}
