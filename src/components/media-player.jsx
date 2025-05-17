import React, { useState, useEffect } from 'react'
import Fab from '@mui/material/Fab'
import NavClose from '@mui/icons-material/Close'
import VideoPlayer from './video'
import { PlayerInfo } from '../components/player-info'
import Sound from './sound'
import useMediaPlayer from "../hooks/useMediaPlayer"
import useBrowserData from '../hooks/useBrowserData'
import { useTranslation } from 'react-i18next'
import { audiobibleOsisId, osisIdAudiobibleTitle } from '../constants/osisAudiobibleId'
import { freeAudioIdOsisMap } from '../constants/osisFreeAudiobible'
import { fnameList_DE_ML } from '../constants/fnameList'
import { isEmptyObj, pad } from '../utils/obj-functions'
import {apiObjGetStorage,apiObjSetStorage} from '../utils/api'

let styles = {
  floatingButton: {
    margin: 0,
    left: 'auto',
    position: 'absolute',
    right: 0,
    zIndex: 1000,
  },
  footerFullsize: {
    height: '100%',
    position: 'fixed',
    right: 0,
    left: 0,
    bottom: 0,
    margin: 0,
    zIndex: 3,
    fontSize: 18,
  },
  footerFB: {
    height: '90%',
    position: 'fixed',
    right: 0,
    left: 0,
    bottom: 0,
    margin: 0,
    zIndex: 3,
    fontSize: 18,
  },
  footerVideo: {
    position: 'fixed',
    right: 0,
    left: 0,
    bottom: 0,
    margin: 0,
    zIndex: 3,
    fontSize: 18,
  },
  footer: {
    display: 'block',
    zIndex: 3,
    fontSize: 18,
    height: 64,
    position: 'fixed',
    right: 0,
    left: 0,
    paddingLeft: 64,
    bottom: 0,
    margin: 0,
    cursor: 'pointer'
  },
}

const Footer = () => {
  const {width, height} = useBrowserData()
  const player = useMediaPlayer()
  const { t } = useTranslation()
  const { curPlay,
          onStopPlaying, setIsPaused, onPlaying, onFinishedPlaying,
          isPaused, isWaitingForPlayInfo} = player
  let tmpPlay = player.curPlay
  if (!tmpPlay) tmpPlay = {curSerie: undefined, curEp: undefined}
  const {curSerie,curEp} = tmpPlay

  const curEpInx = 0
  if (curSerie && curSerie.epList && curEpInx) {
//    curEp = curSerie.epList[curEpInx-1]
  }
  const [hasFinishedPlay, setHasFinishedPlay] = useState(false)
  const [startPos, setStartPos] = useState(0)
  const [curMsPos, setCurMsPos] = useState(undefined)
  const [curPos, setCurPos] = useState()
  const [curDur, setCurDur] = useState()
  const storePos = (msPos) => apiObjSetStorage(curPlay,"mSec",msPos)
  // const ytbURL = "https://www.youtube.com/watch?v=xEK-0n88zSI" // English
  // const ytbURL = "https://www.youtube.com/watch?v=MpGiPo8UuVk" // Deutsch / German
  // const restorePos = async (obj) => {
  //   await apiObjGetStorage(obj,"mSec").then((value) => {
  //     if (value==null){
  //       value=0
  //     }
  //     if ((obj!=null)&&(obj.curSerie!=null)&&(obj.curSerie.episodeList!=null)
  //         &&(obj.curEp!=null)&&((obj.curSerie.episodeList.length-1)===obj.curEp.id)){
  //       apiObjGetStorage(obj,"mSecDur").then((dur) => {
  //         const marginSec = 3 // minimum sec for play - else repeat from beginning
  //         if (value+(marginSec*1000)>dur){
  //           value = 0
  //         }
  //         setStartPos(value)
  //         setCurMsPos(value)
  //       })
  //     } else {
  //       setStartPos(value)
  //       setCurMsPos(value)
  //     }
  //   }).catch((err) => {
  //     console.error(err)
  //   })
  // }
  // useEffect(() => {
  //   if (curPlay!=null){
  //     setHasFinishedPlay(false)
  //     restorePos(curPlay)
  //   }
  // },[curPlay,curEp])
  useEffect(() => {
    let didCancel = false
    const restorePos = async (obj) => {
      await apiObjGetStorage(obj,"mSec").then((value) => {
        if (value==null) {
          if ((obj.curSerie!=null) && (obj.curEp!=null)) {
            value = curEp.begTimeSec * 1000
          } else {
            value=0
          }
        }
        if (!didCancel) {
          setStartPos(value)
          setCurMsPos(value)
        }
      }).catch((err) => console.error(err))
      await apiObjGetStorage(obj,"mSecDur").then((dur) => {
        if (!didCancel) setCurDur(dur)
      }).catch((err) => console.error(err))
    }
    if ((curSerie!=null) && (curEp!=null)){
      restorePos({curSerie, curEp})
    }
    return () => didCancel = true
  },[curPlay,curEp])

  // Reset if less than 3 sec remaining
  // if (value==null){
  //   value=0
  // }
  // if ((obj!=null)&&(obj.curSerie!=null)&&(obj.curSerie.episodeList!=null)
  //     &&(obj.curEp!=null)&&((obj.curSerie.episodeList.length-1)===obj.curEp.id)){
  //   apiObjGetStorage(obj,"mSecDur").then((dur) => {
  //     const marginSec = 3 // minimum sec for play - else repeat from beginning
  //     if (value+(marginSec*1000)>dur){
  //       value = 0
  //     }
  //     setStartPos(value)
  //     setCurMsPos(value)
  //   })
  
  //  Previous version here
  //  useEffect(() => {
  //   let didCancel = false
  //   const restorePos = async (obj) => {
  //     await apiObjGetStorage(obj,"mSec").then((value) => {
  //       if (value==null) {
  //         if ((obj.curSerie!=null) && (obj.curEp!=null)) {
  //           value = curEp.begTimeSec * 1000
  //         } else {
  //           value=0
  //         }
  //       }
  //       if (!didCancel) {
  //         setStartPos(value)
  //         setCurMsPos(value)
  //       }
  //     }).catch((err) => console.error(err))
  //     await apiObjGetStorage(obj,"mSecDur").then((dur) => {
  //       if (!didCancel) setCurDur(dur)
  //     }).catch((err) => console.error(err))
  //   }
  //   if ((curSerie!=null) && (curEp!=null)){
  //     restorePos({curSerie, curEp})
  //   }
  //   return () => didCancel = true
  // },[curPlay,curEp])

  const closeFooter = () => {
console.log(curMsPos)
    storePos(curMsPos)
    setIsPaused(false)
    if (onStopPlaying) onStopPlaying()
  }

  const movePos = (percent) => {
    if (percent!=null){
      let newPos = 0
      if (curDur!=null){
        newPos = Math.floor(percent * curDur / 100) // Divide by 100 in order to get promille - i.e. milliseconds
      }
      setHasFinishedPlay(false)
      setStartPos(newPos)
      setCurMsPos(newPos)
    }
  }

  const handleVideoDuration = (dur) => {
    const durMSec = dur * 1000
    apiObjSetStorage(curPlay,"mSecDur",durMSec)
    setCurDur(durMSec)
  }

  const handleVideoProgress = (pos) => {
    const posMSec = pos.playedSeconds *1000
    if (pos.playedSeconds>curEp.endTimeSec){
      // closeFooter()
      storePos(curEp.begTimeSec * 1000) // reset to beginning
      if (onStopPlaying) onStopPlaying()
    } else {
      storePos(posMSec)
      setCurMsPos(posMSec)
      if (onPlaying){
        const cur = {position: posMSec, duration: curDur}
        onPlaying(cur)
      }
    }
  }

  const handleStop = () => setHasFinishedPlay(false)
  const handleSetPaused = (isPaused) => {
console.log("handleSetPaused")
    setIsPaused(isPaused)
    if (!isPaused) setHasFinishedPlay(false)
  }

  const handleLoading = (cur) => {
    if (curDur !== cur.duration){
      apiObjSetStorage(curPlay,"mSecDur",cur.duration)
      setCurDur(cur.duration)
    }
  }

  const updatePos = (cur) => {
    if (!isPaused) {
      const newPos = Math.floor(cur.position / 1000)
      if (curPos !== newPos) {
        storePos(cur.position)
      }
      if (curDur !== cur.duration){
        apiObjSetStorage(curPlay,"mSecDur",cur.duration)
        setCurMsPos(cur.position)
        setCurPos(newPos)
        setCurDur(cur.duration)
      } else {
        setCurMsPos(cur.position)
        setCurPos(newPos)
      }
    }
  }

  const handlePlaying = (cur) => {
// BUG FIX !!!
    const soundPlayerBugFix = hasFinishedPlay
    if ((!soundPlayerBugFix) && (!isPaused)) {
      updatePos(cur)
      if (onPlaying) onPlaying(cur)
    }
  }

  const handleFinishedVideoPlaying = () => {
    if (onFinishedPlaying) onFinishedPlaying()
  }

  const handleFinishedPlaying = () => {
console.log("handleFinishedPlaying")
    setHasFinishedPlay(true)
    handleFinishedVideoPlaying()
  }

  const getIndexOfBibleBook = (bk) => {
    let retVal = undefined
    Object.keys(osisIdAudiobibleTitle ).forEach((key, index) => {
      if (key===bk) retVal = index +1
    })
    return pad(retVal)
  }

  const topMargin = 60

  let curHeight = Math.trunc(width*9/16)
  if (curHeight>height-topMargin){
    curHeight = height-topMargin
  }

  let useSec
  let useDur
  let downloadName
  if (curMsPos!=null) useSec = Math.floor(curMsPos / 1000)
  if (curDur!=null) useDur = Math.floor(curDur / 1000)
  let locURL = ""
  let locPath = ""
  let curPlayState = isPaused ? Sound.status.PAUSED : Sound.status.PLAYING
  const typeFound = (type) => {
    if (curEp && curEp.mediaType) return curEp.mediaType===type
    return (curSerie &&(curSerie.mediaType===type))
  }
  const videoFound = typeFound("vid")
  let audioFound = typeFound("audio")
  const bibleFound = typeFound("bible")
  const btnStyle =  Object.assign({}, styles.floatingButton)
  let idStr = "footer"
  if ((curPlay!=null)) {
    let bibleObj
    if ((curEp!=null)&&(curEp.bibleType)) {
      bibleObj = curEp
    }
    locPath = locURL
    if (videoFound && (curEp!=null)) {
      locURL = curSerie?.listYtbURL[curSerie?.language]
      locPath = locURL
    } else if ((curEp!=null)&&(curEp.filename!=null)) {
      locURL = curEp.filename
    } else if ((curSerie!=null)&&(curSerie.curPath!=null)) {
      locURL = curSerie.URL
    }
    locPath = locURL
//    locPath = getLocalMediaFName(locURL)
    if (videoFound){
      idStr = "footer-video"
    } else if (bibleFound) {
      locURL = ""
      if (!isEmptyObj(bibleObj)){
        const {bk,id} = bibleObj
        let idStr = pad(id)
        let curFName
        if (curSerie.audioTreasureType) {
          let bBookId = osisIdAudiobibleTitle[bk]
          if (bk==="Ps") {
            bBookId = "Psalm"
            if (id<100) {
              idStr = "0" +pad(id)
            }
          } else if (bk==="Song") {
            bBookId = "Song_of_Solomon"
          }
          curFName = `${curSerie.curPath}${getIndexOfBibleBook(bk)}_${bBookId}_${idStr}.mp3`
        } else if (curSerie.audioBible_de_ML) {
          let bBookId = fnameList_DE_ML[bk]
          if (id<100) {
            idStr = "0" +pad(id)
          }
          curFName = `${curSerie.curPath}${getIndexOfBibleBook(bk)}${idStr}-${bBookId}_Kapitel-${idStr}.mp3`
        } else if (curSerie.vachanServerType) {
          const useBkId = freeAudioIdOsisMap[bk]
          curFName = `${curSerie.curPath}${useBkId.toLowerCase()}/${id}.mp3`
        } else if (curSerie.wordProjectType) {
          let bkIndex = undefined
          Object.keys(osisIdAudiobibleTitle ).forEach((key, index) => {
            if (key===bk) bkIndex = index +1
          })
          curFName = `${curSerie.curPath}${bkIndex}/${id}.mp3`
        // } else if (curSerie.audioBible_de_TJ_HJ) {
        //   let bBookId = fnameList_DE_TJ_HJ[bk]
          // chExceptionList_DE_TJ_HJ 
          // underscoreExceptionList_DE_TJ_HJ
        } else if (curSerie.freeType) {
            if ((bk==="Ps") && (id<100)){
            idStr = "0" +pad(id)
          }
          curFName = curSerie.curPath + "/"
                            + freeAudioIdOsisMap[bk] + idStr + ".mp3"
        } else if (curSerie.bbProjectType) {
          curFName = curSerie.curPath
        } else {
          curFName = curSerie.curPath + "/"
          curSerie.pathPattern && curSerie.pathPattern.forEach(part => {
            curFName += getPatternContent(part,bk,idStr)
          })
        }
        locURL = curFName
        locPath = locURL
        audioFound = true
      }
    }
  }
  const fullSizeFound = videoFound
  const isFB = curEp && curEp.fb
  const position = 'relative'
  const top = '0px'
  if (locURL?.length>0) {
    return (
      <footer
        id={idStr}
        style={isFB ?  styles.footerFB : videoFound ? styles.footerVideo : fullSizeFound ? styles.footerFullsize : styles.footer}>
        {audioFound && (<div>
          <Sound
            url={locPath}
            autoPlay
            playStatus={curPlayState}
            playFromPosition={startPos}
            onLoading={handleLoading}
            onPlaying={handlePlaying}
            onStop={handleStop}
            onFinishedPlaying={handleFinishedPlaying} />
          <PlayerInfo
            containerWidth={width}
            curSec={useSec}
            curDur={useDur}
            isPaused={isPaused}
            isWaitingForPlayInfo={isWaitingForPlayInfo}
            episode={curPlay.curEp}
            serie={curPlay.curSerie}
            onSetPaused={handleSetPaused}
            url={locPath}
            downloadName={downloadName}
            onMovePosCallback={movePos}
            onCloseCallback={closeFooter} />
        </div>)}
        <div style={{position, top: top, height: '80%', width: '100%', maxWidth: isFB ? 450 : width}}>
          <Fab
            size="small"
            onClick={closeFooter}
            style={btnStyle}
          >
            <NavClose />
          </Fab>
          {videoFound && (
            <VideoPlayer
              url={locPath}
              fullSize={fullSizeFound}
              isFB={curEp.fb}
              isPaused={isPaused}
              playFromPosition={startPos}
              onEnded={handleFinishedVideoPlaying}
              onDuration={handleVideoDuration}
              onProgress={handleVideoProgress}
              width={width}
              height={curHeight}
              playing
              controls />
          )}
        </div>
      </footer>
    )
  } else {
     return (
       <footer id="footer" style={{display: 'none' }}>
       </footer>
    )
  }
}

export const MediaPlayer = (props) => {
  const [isWaitingForPlayInfo, setIsWaitingForPlayInfo] = useState(false)
  const [isPaused, setIsPaused] = useState(true)
  const [curCheckPos, setCurCheckPos] = useState(undefined)
  const [curPos, setCurPos] = useState()
  const player = useMediaPlayer()
  const {curSerie, curEp} = player

  const handlePlaying = (cur) => {
    if (!isPaused) {
      if ((cur!=null) && (cur.position!=null)
        && isWaitingForPlayInfo){
        if (cur.position!==curCheckPos){
          setCurCheckPos(cur.position)
          setIsWaitingForPlayInfo(false)
        } else {
          setCurCheckPos(cur.position)
        }
      }
      const {curSerie} = props
      if ((curSerie!=null)&&(curSerie.nextLevelPos!=null)){
        if (cur.position-(curSerie.nextLevelPos*1000)>=cur.duration){
          if (props.onEndOfLevel!=null) props.onEndOfLevel()
        }
      }
      if (props.onPlaying) props.onPlaying({position: cur.position, duration: cur.duration})
      setCurPos(cur)
    }
  }

  const handleStopPlaying = () => {
    player.onStopPlaying()
    setIsPaused(false)
    setIsWaitingForPlayInfo(false)
    setCurCheckPos(undefined)
    if (props.onStopPlaying) props.onStopPlaying()
  }

  return (
      <Footer
        curSerie={curSerie}
        curEp={curEp}
        isPaused={isPaused}
        isWaitingForPlayInfo={isWaitingForPlayInfo}
        curPos={curPos}
        onSetPaused={(isPaused) => setIsPaused(isPaused)}
        onPlaying={handlePlaying}
        onFinishedPlaying={() => props.onFinishedPlaying()}
        onStopPlaying={handleStopPlaying}
      />
  )
}

export default MediaPlayer
