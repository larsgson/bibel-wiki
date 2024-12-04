import React, { useState, useEffect, useCallback  } from 'react'
import { apiSetStorage, apiGetStorage, apiObjGetStorage, apiObjSetStorage } from '../utils/api'
import { osisIconId, osisIconList } from '../constants/osisIconList'
import { unique } from 'shorthash'
import { pad } from '../utils/obj-functions'
import { useTranslation } from 'react-i18next'

const MediaPlayerContext = React.createContext([{}, () => {}])
const MediaPlayerProvider = (props) => {
  const [state, setState] = useState({
    isPlaying: false,
  })
  const { t } = useTranslation()
  const setStateKeyVal = (key,val) => setState(state => ({ ...state, [key]: val }))

  const [isPaused, setIsPaused] = useState(false)
  const [imgPos, setImgPos] = useState({});

  const preNav = "https://img.bibel.wiki/navIcons/"
  const picsPreNav = "https://img.bibel.wiki/img/free-pics/"

  const fetchJSONDataFrom = useCallback(async (inx) => {
    const response = await fetch(`data/img_pos${pad(inx +1)}.json`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    });
    const data = await response.json();
    setImgPos((prev) => ({
      ...prev,
      [inx]: data,
    }));
  }, []);

  useEffect(() => {
    const getDataForAllStories = async () => {
      const maxStories = 50
      for(let i=0; i < maxStories; i++) {
        // Wait for each task to finish
        await fetchJSONDataFrom(i);
      }      
    }
    getDataForAllStories()
  }, [fetchJSONDataFrom]);

  useEffect(() => {
    const getNavHist = async () => {
      const navHist = await apiGetStorage("navHist")
      setState(prev => ({...prev, navHist}))
    }
    getNavHist()
  }, []);

  const togglePlay = () => {
//    state.isPlaying ? player.pause() : player.play()
    setStateKeyVal( "isPlaying", !state.isPlaying )
  }

  const skipToNextTrack = () => {
//    playTrack(newIndex)
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

  // eslint-disable-next-line no-unused-vars
  const getChFreePic = (bookObj,ch) => {
    const {level1,level2} = bookObj
    let checkIcon = "000-" + pad(level1)
    if (level2!=null) checkIcon = "00-" + pad(level1) + level2
    let imgSrc
    let useDefaultImage = true
    // Book Icon - To Do - to be added in the future
    // imgSrc = preBook +getOsisIcon(bk) +".png"
    // Replace this above with book icons !
    const lng = "en"
    const bk = (bookObj!=null)?bookObj.bk:null
    if (bk!=null){ // level 3
      const checkObj = osisIconList[bk]
      if (checkObj!=null){
        let useCh
        if (ch==null){
          const entry = Object.entries(checkObj)[0]
          useCh = entry[0]
          if (bk!=null){ // level 3
            const {beg,end} = bookObj
            if ((beg!=null)&&(end!=null)){
              useCh = Object.keys(checkObj).find(key => key>=beg)
            }
          }
        } else {
          if (checkObj[ch]!=null) useCh = ch
        }
        if (useCh!=null){
          const prefixIdStr = osisIconId[bk]
          const firstId = pad(parseInt(useCh))
          const firstEntry = checkObj[useCh][0].slice(0,2) // only accept first two numbers - ignore any trailing letter
          // checkIcon = osisIconId[bk] + "_" + firstId + "_" + firstEntry
          checkIcon = `${prefixIdStr.slice(0,2)}/610px/${osisIconId[bk]}_${firstId}_${firstEntry}_RG`
          useDefaultImage = false
        }
      }
    }
    imgSrc = useDefaultImage ? preNav +checkIcon +".png" : picsPreNav +checkIcon +".jpg"
    return {
      imgSrc,
      ch,
    }
  }
  
   const updateImgBasedOnPos = ( curInx, msPos ) => {
    let checkMsPosArray = []
    if (imgPos) {
      checkMsPosArray = imgPos[ curInx ]
    }
    let retImgSrc = `${pad(curInx+1)}-01`
    checkMsPosArray?.map(checkObj => {
      const checkMs = parseInt(checkObj.pos) * 1000
      if (msPos>=checkMs) retImgSrc = checkObj.img
    })
    return `obsIcons/obs-en-${retImgSrc}.jpg`
  }

  const onPlaying = (curPos) => {
    const curImgSrc = state?.syncImgSrc
    const curInx = state?.curEp?.id
    const msPos = curPos?.position
    const curSerId = state?.curPlay?.curSerie?.uniqueID
    let nextImgSrc
    if (curSerId === "uW.OBS.en") {
      nextImgSrc = updateImgBasedOnPos( curInx, msPos )
    } else if (state?.curPlay?.curSerie?.mediaType === "bible") {
      const ep = state?.curPlay?.curEp
      const bk = ep?.bookObj
      const imgObj = getChFreePic(bk,ep?.id)
      nextImgSrc = imgObj?.imgSrc
    }
    if (nextImgSrc!==curImgSrc) setStateKeyVal( "syncImgSrc", nextImgSrc )
    setStateKeyVal( "curPos", curPos )
  }

  const updateStorage = async (idStr,val) => {
    await apiSetStorage(idStr,val)
  }

  const startPlay = async (topIdStr,inx,curSerie,curEp) => {
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
      const navHistEp = {...tmpEp,topIdStr}
      const navHist = {...state.navHist, [curSerId]: navHistEp}
      await updateStorage("navHist",navHist)
      await updateStorage("curSerId",curSerId)
      const curInx = tmpEp?.id
      const syncImgSrc = updateImgBasedOnPos( curInx, 0 )
      setState(state => ({...state, navHist, syncImgSrc, curSerId, curSerie, curEp: tmpEp}))
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
