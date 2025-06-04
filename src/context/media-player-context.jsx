import React, { useState, useEffect, useCallback  } from 'react'
import { apiSetStorage, apiGetStorage, apiObjGetStorage, apiObjSetStorage } from '../utils/api'
import { unique } from 'shorthash'
import { pad, getChFreePicFirstEntry } from '../utils/obj-functions'
import { useTranslation } from 'react-i18next'
import { serieLang, serieNaviType } from '../utils/dynamic-lang'
import { freeAudioId, freeAudioIdOsisMap } from '../constants/osisFreeAudiobible'
import { contentByLang } from '../constants/content-by-lang'
import { 
  audioByID, 
  audioWithTimestampsSet, 
  langWithTimestampsSet 
} from '../constants/audio-by-b-id'
import { iconsSyncData } from '../constants/iconsSyncData'
import { freePixId, osisIconList } from '../constants/osisIconList'
import { versesPerCh, getImgSrcString, getValidVerse } from '../constants/naviChaptersJohn'

const MediaPlayerContext = React.createContext([{}, () => {}])
const MediaPlayerProvider = (props) => {
  const [state, setState] = useState({
    isPlaying: false,
  })
  const { t, i18n } = useTranslation()
  const setStateKeyVal = (key,val) => setState(state => ({ ...state, [key]: val }))

  const [isPaused, setIsPaused] = useState(false)
  const [imgPosOBS, setImgPosOBS] = useState({})
  const [imgPosAudio, setImgPosAudio] = useState({})
  const [verseTextPosAudio, setVerseTextPosAudio] = useState([])
  const [verseText, setVerseText] = useState({})
  const apiURLPath = "https://demo-api-bibel-wiki.netlify.app"
  const apiBasePath = `${apiURLPath}/.netlify/functions`
  const [timestampParamStr, setTimestampParamStr] = useState("")
  const [textParamStr, setTextParamStr] = useState("")

  const fetchJSONDataFrom = useCallback(async (inx) => {
    const response = await fetch(`data/img_pos${pad(inx +1)}.json`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    })
    const data = await response.json()
    setImgPosOBS((prev) => ({
      ...prev,
      [inx]: data,
    }))
  }, [])

  useEffect(() => {
    const getDataForAllStories = async () => {
      const maxStories = 50
      for(let i=0; i < maxStories; i++) {
        // Wait for each task to finish
        await fetchJSONDataFrom(i)
      }      
    }
    getDataForAllStories()
  }, [fetchJSONDataFrom])

  useEffect(() => {
    const getLocationData = async () => {
      const usePath = `${apiURLPath}/geolocation`
      const response = await fetch(usePath)
      const data = await response.json()
      console.log(data?.country?.code)
      return data?.country?.code
    }
    const getCurCountry = async () => {
      const curCountry = await apiGetStorage("selectedCountry")
      setStateKeyVal("selectedCountry",curCountry)
    }
    const getConfirmedCountry = async () => {
      const curConfirmedCountry = await apiGetStorage("confirmedCountry")
      if (curConfirmedCountry) {
        setStateKeyVal("confirmedCountry",true)
      } else {
        console.log(`Check location`)
        const detectedCountry = await getLocationData()
        console.log(`Country: ${detectedCountry}`)
        setStateKeyVal("detectedCountry",detectedCountry)
      }
    }
    const getCurLangs = async () => {
      const curLangs = await apiGetStorage("selectedLang")
      if (curLangs) {
        setStateKeyVal("selectedLang",curLangs)
      }
    }
    const getNavHist = async () => {
      const navHist = await apiGetStorage("navHist")
      setState(prev => ({...prev, navHist}))
    }
    getCurCountry()
    getConfirmedCountry()
    getCurLangs()
    getNavHist()
  }, [])


  useEffect(() => {
    const getLangData = async (useLang) => {
      console.log(useLang)
      const usePath = `${apiURLPath}/.netlify/functions/get-content-by-lang`
      const response = await fetch(usePath, {
        method: 'POST',
        body: JSON.stringify({
          langCode: useLang,
          query: ["a","t"]
        })
      }).then(response => response.json())
      console.log(response?.data)
      setStateKeyVal("langDataJsonStr",JSON.stringify(response?.data))
    }
    if ((state?.selectedLang) && (state.selectedLang.length>0)) getLangData(state.selectedLang)
  }, [state.selectedLang,state.detectedLang])

  useEffect(() => {
    const getCurCountryData = async (useCountry) => {
      const usePath = `${apiURLPath}/.netlify/functions/get-languages`
      const response = await fetch(usePath, {
        method: 'POST',
        body: JSON.stringify({
          countryCodeList: [useCountry,"*"],
          query: ["a","t"]
        })
      }).then(response => response.json())
      setStateKeyVal("curCountryJsonStr",JSON.stringify(response?.data[useCountry]))
      setStateKeyVal("langListJsonStr",JSON.stringify(response?.data?.allLanguages))
    }
    if ((state?.selectedCountry) && (state.selectedCountry.length>0)) {
      getCurCountryData(state.selectedCountry)
    } else if ((state?.detectedCountry) && (state.detectedCountry.length>0)) {
      getCurCountryData(state.detectedCountry)
    }
  }, [state.selectedCountry,state.detectedCountry])

  useEffect(() => {
    const getTimecodeData = async () => {
      if (timestampParamStr?.length>0) {
        const fetchTimestampPath = `${apiBasePath}/get-timestamps`
        const curApiParam = JSON.parse(timestampParamStr)
        // const curBook = osisFromFreeAudioId(curApiParam?.bookID)
        const curBookInx = freeAudioId.findIndex(el => (el === curApiParam?.bookID)) +1
        const curCh = curApiParam?.ch
        let doFetch = false
        let curIconList
        let chIconData
        let tsType 
        let resData
        if ((curBookInx === 43) && langWithTimestampsSet.has(state.selectedLang)) {
          tsType = "johnPics"
          doFetch = true
        } else if (iconsSyncData && iconsSyncData[curBookInx] && iconsSyncData[curBookInx][curCh]) {
          tsType = "sweetPublishing"
          chIconData = iconsSyncData[curBookInx][curCh]
          curIconList = Object.keys(chIconData)
          doFetch = (curIconList.length>1)
        }
        if (doFetch) {
          const resTimestamp = await fetch(fetchTimestampPath, {
            method: 'POST',
            body: timestampParamStr
          })
          .then(resTimestamp => resTimestamp.json())
          .catch(error => console.error(error))
          resData = resTimestamp?.data
          setVerseTextPosAudio(resData)
        }
        if (tsType === "sweetPublishing") {
          const timestampPoints = curIconList.map((verse,inx) => {
            let pos = 0
            const vInx = parseInt(verse)
            const img = chIconData[vInx].id[0]
            if (inx!==0) {
              pos = resData[vInx]?.timestamp
            }
            return {
              img,
              pos
            }  
          })
          setImgPosAudio(timestampPoints)
        } else { // if (tsType === "johnPics") {
          const timestampPoints = [...Array(versesPerCh[curCh])].map((_,i) => {
            return {
              img: getImgSrcString(curCh,i+1) || getImgSrcString(curCh,getValidVerse(curCh,i+1)),
              pos: resData[i]?.timestamp
            }
          })
          setImgPosAudio(timestampPoints)
        }
      } else {
        setVerseTextPosAudio([])
        setImgPosAudio({})
      }
    }
    getTimecodeData()
  }, [timestampParamStr])

  useEffect(() => {
    const getTextData = async () => {      
      if (textParamStr.length>0) {
        const fetchTextPath = `${apiBasePath}/get-text`
        const resText = await fetch(fetchTextPath, {
          method: 'POST',
          body: textParamStr
        })
        .then(resText => resText.json())
        .catch(error => console.error(error))
        const useVerseText = {}
        resText?.data.forEach(obj => {
          useVerseText[obj.verse_start] = obj.verse_text
        })
        setVerseText(useVerseText)
      }
    }
    getTextData()
  }, [textParamStr])

  const getAudioFilesetId = (langID) => {
    let hasTs = false
    let filesetID = undefined
    let curPriority = 0
    let idList
    let langData
    if (state.langDataJsonStr && state.langDataJsonStr.length>0) {
      langData = JSON.parse(state.langDataJsonStr)
      if (langData?.a) {
        // idList = Object.keys(langData?.a)
        console.log(idList)
      }
    }
    const audioIdList = contentByLang[langID]?.a
    audioIdList && audioIdList.forEach(audioID => {
      if (idList && idList.includes(audioID)) {
        const idData = langData.a[audioID]
        hasTs = idData.ts
        const fsIdList = Object.keys(idData?.fs)
        if (fsIdList && fsIdList.length>0) {
          fsIdList.filter(key => (key.indexOf("opus")<0)).forEach(key => {
            // const fsObj = idData.fs[key]
            const typeStr = key.substring(6,8)
            const dramaType = (typeStr.length>1) && (typeStr[1] === "2")
            const hasNT = (typeStr.length>1) && (typeStr[0] === "N")
            let chkP = dramaType ? 2 : 1
            const fullStr = key
            // Always prioritise higher for audio with timestamps - add 10
            if (idData.ts) chkP += 10
            if ((hasNT) && (chkP>curPriority)) {
              if (idData.ts) console.log("hasTS")
              curPriority = chkP 
              filesetID = fullStr
            }
          })
        }
      } else {
        const fIdList = audioByID[audioID]
        if (fIdList) {
          fIdList.forEach(aType => {
            const chkType = aType.substring(1)
            let chkP = parseInt(chkType)
            // Always prioritise higher for audio with timestamps - add 10
            const useIdStr = `${audioID}${aType}DA`
            if (audioWithTimestampsSet.has(useIdStr)) chkP += 10
            if (chkP>curPriority) {
              curPriority = chkP 
              filesetID = useIdStr
            }
          })
        }
      }
    })
    console.log(filesetID)
    if (!filesetID) {
      // Check other options from all idList entries
      if (idList && idList.length>0) {
        idList.forEach(idStr => {
          if (!hasTs) { // Stop searching after first audio with timestampa
            const idData = langData.a[idStr]
            hasTs = idData.ts
            const fsIdList = Object.keys(idData?.fs)
            if (fsIdList && fsIdList.length>0) {
              fsIdList.forEach(key => {
                // const fsObj = idData.fs[key]
                const typeStr = key.substring(6,8)
                console.log(typeStr)
                const dramaType = (typeStr.length>1) && (typeStr[1] === "2")
                let chkP = dramaType ? 2 : 1
                const fullStr = key
                // Always prioritise higher for audio with timestamps - add 10
                if (idData.ts) chkP += 10
                if (chkP>curPriority) {
                  curPriority = chkP 
                  filesetID = fullStr
                }
              })
            }
          }
        })
      }
    }
    return filesetID
  }
  
  const getTextFilesetId = (langID,audioID) => { 
    let retFilesetID = "" 
    let idList
    let langData
    if (state.langDataJsonStr && state.langDataJsonStr.length>0) {
      langData = JSON.parse(state.langDataJsonStr)
      if (langData?.t) {
        idList = Object.keys(langData?.t)
        console.log(idList)
      }
    }
    const textIDList = contentByLang[langID]?.t
    textIDList && textIDList.forEach(tID => {
      if (idList && idList.includes(tID)) {
        const idData = langData.t[tID]
        const fsIdList = Object.keys(idData?.fs)
        if (fsIdList && fsIdList.length>0) {
          fsIdList.filter(key => (key.indexOf("json")<0)).forEach(key => {
            const fsObj = idData.fs[key]
            if (fsObj?.size==="NT") {
              console.log(key)
              retFilesetID = key
            }
          })
        }
      } else if (textIDList.length>0) {
        retFilesetID = textIDList[0] // select first entry by default
        if (textIDList.length>1) // go through list, if more than one
        textIDList.forEach(checkID => {
          // Prioritise equal to audioID, if exists
          if (checkID===audioID) retFilesetID = checkID
        })
      }
    })
    return retFilesetID
  }
  

  const togglePlay = () => {
//    state.isPlaying ? player.pause() : player.play()
    setStateKeyVal( "isPlaying", !state.isPlaying )
  }

  const skipToNextTrack = () => {
//    playTrack(newIndex)
  }

  const setSelectedCountry = async (newCountry) => {
    setStateKeyVal("selectedCountry",newCountry)
    await apiSetStorage("selectedCountry",newCountry)
  }

  const setConfirmedCountry = async (newCountry) => {
    setStateKeyVal("selectedCountry",newCountry)
    await apiSetStorage("selectedCountry",newCountry)
    setStateKeyVal("confirmedCountry",true)
    await apiSetStorage("confirmedCountry",true)
  }

  const setSelectedLang = async (newLang) => {
    setStateKeyVal("selectedLang",newLang)
    await apiSetStorage("selectedLang",newLang)
  }

  const onFinishedPlaying = () => {
    console.log("onFinishedPlaying")
    if (state.curPlay) {
      apiObjSetStorage(state.curPlay,"mSec",state.curEp.begTimeSec * 1000) // Reset the position to beginning
      const {curSerie, curEp} = state.curPlay
      if (curSerie){
        if ((curSerie.episodeList!=null) && (curSerie.episodeList.length>0)
            && (curEp!=null)){
          // This serie has episodes
          let epInx = curEp.id
          epInx+=1
          let newPlayObj = {curSerie}
          apiObjSetStorage(newPlayObj,"curEp",epInx)
          if (curSerie.episodeList[epInx]!=null){
            newPlayObj.curEp=curSerie.episodeList[epInx]
          }
          setStateKeyVal( "curPlay", newPlayObj)
        } else {
          let newPlayObj
          setStateKeyVal( "curPlay", newPlayObj)
        }
      }
    }
  }

  const onStopPlaying = () => {
    setStateKeyVal( "curPlay", undefined )
    setStateKeyVal( "curSerie", undefined )
    setStateKeyVal( "curEp", undefined )
  }

  const updateImgBasedOnPos = ( navType, ep, curInx, msPos ) => {
    let checkMsPosArray = []
    let curImgSrc = ""
    let retStr = ""
    if ((navType === "audioStories") && (imgPosOBS)) {
      checkMsPosArray = imgPosOBS[ curInx ]
      curImgSrc = `${pad(curInx+1)}-01`
    } else if (navType === "audioBible") {
      checkMsPosArray = imgPosAudio
    }
    (checkMsPosArray?.length>0) && checkMsPosArray?.map(checkObj => {
      const checkMs = parseInt(checkObj.pos) * 1000
      if (msPos>=checkMs) curImgSrc = checkObj.img
    })
    if (navType === "audioStories") {
      retStr = `https://storage.googleapis.com/img.bibel.wiki/obsIcons/obs-en-${curImgSrc}.mp4`
    } else if (navType === "audioBible") {
      const bookObj = ep?.bookObj
      const checkLang = ep?.lang || state.selectedLang
      if ((bookObj?.bk==="John") && langWithTimestampsSet.has(checkLang)) {
        retStr = curImgSrc
      } else if (bookObj) {
        const preNav = "https://storage.googleapis.com/img.bibel.wiki/navIcons/"
        const picsPreNav = "https://storage.googleapis.com/img.bibel.wiki/img/free-pics/"
        let useDefaultImage = true
        const {level1,level2} = bookObj
        let checkIcon = "000-" + pad(level1)
        if (level2!=null) checkIcon = "00-" + pad(level1) + level2
        const bk = (bookObj!=null)?bookObj.bk:null
        if (bk!=null){ // level 3
          if (curImgSrc && (curImgSrc?.length > 0)) {
            const checkObj = osisIconList[bk]
            if (checkObj!=null){
              const ch = ep?.id
              if (checkObj[ch]!=null){
                const curImgP1 = curImgSrc.substring(0,2)
                const curImgP2 = curImgSrc.substring(2)
                // const firstId = pad(parseInt(ch))
                checkIcon = `${curImgP1}/610px/${curImgP1}_${freePixId[curImgP1]}${curImgP2}_RG`
                useDefaultImage = false
              }
            }
            retStr = useDefaultImage ? preNav +checkIcon +".png" : picsPreNav +checkIcon +".jpg"
          } else {
            const tempImgObj = getChFreePicFirstEntry(bookObj,ep?.id)
            retStr = tempImgObj.imgSrc
          }    
        }
      }
    }
    return retStr
  }

  const updateTextBasedOnPos = ( msPos ) => {
    let retStr = ""
    let checkVerseInx = 0
    const offsetMs = 300
    const checkMsPosArray = verseTextPosAudio
    if ((checkMsPosArray) && (checkMsPosArray?.length>0)) {
      checkMsPosArray?.map(checkObj => {
        const checkMs = checkObj.timestamp * 1000
        if ((msPos+offsetMs)>=checkMs) checkVerseInx = parseInt(checkObj.verse_start)
      })
    }
    if (checkVerseInx>0) retStr = verseText[checkVerseInx] || ""
    return retStr
  }


  const onPlaying = (curPos) => {
    const curImgSrc = state?.syncImgSrc
    const curInx = state?.curEp?.id
    const msPos = curPos?.position
    const curSerId = state?.curPlay?.curSerie?.uniqueID
    let nextImgSrc
    const curEp = state?.curPlay?.curEp
    const topIdStr = curEp?.topIdStr
    const nType = serieNaviType(topIdStr)

    if ((curSerId === "uW.OBS.en") || (nType === "audioBible")) {
      nextImgSrc = updateImgBasedOnPos( nType, curEp, curInx, msPos )
    }
    if (nextImgSrc!==curImgSrc) {
      setStateKeyVal( "syncImgSrc", nextImgSrc )
    }
    let nextText
    const curVerseText = state?.syncVerseText
    if (nType === "audioBible") {
      nextText = updateTextBasedOnPos( msPos )
    }
    if (nextText!==curVerseText) {
      setStateKeyVal( "syncVerseText", nextText )
    }
    setStateKeyVal( "curPos", curPos )
  }

  const startPlay = async (topIdStr,inx,curSerie,curEp) => {
    if (curSerie.bbProjectType) {
      const fetchPath = `${apiBasePath}/get-audio-url`
      const audioFilesetID = getAudioFilesetId(curSerie.langID)
      console.log(audioFilesetID)
       const response = await fetch(fetchPath, {
        method: 'POST',
        body: JSON.stringify({
          filesetID: audioFilesetID,
          bookID: freeAudioIdOsisMap[curEp?.bk],
          ch: curEp?.id,
          query: ["path"]
        })
      }).then(response => response.json())
      curSerie.curPath = response?.data?.path
      setTextParamStr(JSON.stringify({
        filesetID: getTextFilesetId(curSerie.langID,audioFilesetID),
        bookID: freeAudioIdOsisMap[curEp?.bk],
        ch: curEp?.id,
        query: ["verse_text", "verse_start"]
      }))
      if (audioWithTimestampsSet.has(audioFilesetID)) {
        // fetch timecode in the background
        setTimestampParamStr(JSON.stringify({
          filesetID: audioFilesetID,
          bookID: freeAudioIdOsisMap[curEp?.bk],
          ch: curEp?.id,
          query: ["verse_start", "timestamp"]
        }))
      } else {
        setTimestampParamStr("")
      }
    }
    if (!curSerie){ // stop playing
      let newPlayObj
      setStateKeyVal( "curPlay", newPlayObj)
    } else {
      let tmpEp = curEp
      if ((!tmpEp) && (curSerie.episodeList!=null)
          && (curSerie.episodeList[inx]!=null)){
        tmpEp=curSerie.episodeList[inx]
      }
      // This serie has episodes
      let newPlayObj = {curSerie,curEp}
      if (curEp!=null){
//          props.onStartPlay && props.onStartPlay(curSerie,curEp)
        await apiObjSetStorage({curSerie},"curEp",curEp.id)
        setStateKeyVal( "curPlay", newPlayObj)
      } else {
        apiObjGetStorage(newPlayObj,"curEp").then((value) => {
          if ((value==null)||(curSerie && curSerie.episodeList && curSerie.episodeList[value]==null)){
            value=0
            apiObjSetStorage(newPlayObj,"curEp",0)
          }
          if (curSerie && curSerie.episodeList && curSerie.episodeList[value]!=null){
            newPlayObj.curEp=curSerie.episodeList[value]
          }
//            props.onStartPlay && props.onStartPlay(curSerie,curSerie.episodeList[value])
          setStateKeyVal( "curPlay", newPlayObj)
        }).catch((err) => {
          console.error(err)
        })
      }
      const curSerId = curSerie.uniqueID || unique(curSerie.title)
      const lang = serieLang(topIdStr)
      const nType = serieNaviType(topIdStr)
      const langID = curSerie.langID
      const navHistEp = {...tmpEp,topIdStr,lang,langID}
      const navHist = {...state.navHist, [curSerId]: navHistEp}
      await apiSetStorage("navHist",navHist)
      await apiSetStorage("curSerId",curSerId)
      const curInx = tmpEp?.id
      const syncImgSrc = 
        ((curSerId === "uW.OBS.en") || (nType === "audioBible")) 
          ? updateImgBasedOnPos( nType, curEp, curInx, 0 ) 
          : ""
      const syncVerseText =
        (nType === "audioBible") 
      ? updateTextBasedOnPos( 0 ) 
      : ""
    setState(state => ({...state, navHist, syncImgSrc, syncVerseText, curSerId, curSerie, curEp: tmpEp}))
      // setState(state => ({...state, syncImgSrc, curSerId, curSerie, curEp: tmpEp}))
    }
  }

  const value = {
    state: {
      ...state,
      isPaused,
    },
    actions: {
      setState,
      startPlay,
      togglePlay,
      onStopPlaying,
      onPlaying,
      onFinishedPlaying,
      setIsPaused,
      setSelectedCountry,
      setConfirmedCountry,
      setSelectedLang,
      skipToNextTrack,
    }
  }

  return (
    <MediaPlayerContext.Provider value={value}>
      {props.children}
    </MediaPlayerContext.Provider>
  )
}

//viewLibrary,

export {MediaPlayerContext, MediaPlayerProvider}
