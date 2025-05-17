import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import ImageList from '@mui/material/ImageList'
import ImageListItem from '@mui/material/ImageListItem'
import { pad, isEmptyObj } from '../utils/obj-functions'
import { osisIconId, osisIconList } from '../constants/osisIconList'
import { getOsisChTitle, getChoiceTitle } from '../constants/osisChTitles'
import useMediaPlayer from "../hooks/useMediaPlayer"
import useBrowserData from "../hooks/useBrowserData"
import BibleviewerApp from './bible-viewer-app'
import HistoryView from './history-view'
import { getSerie, serieLang, serieNaviType } from '../utils/dynamic-lang'

const preNav = "https://storage.googleapis.com/img.bibel.wiki/navIcons/"

const HomeView = (props) => {
  const { onStartPlay } = props
  // eslint-disable-next-line no-unused-vars
  const { navHist, startPlay, curPlay, syncImgSrc, syncVerseText } = useMediaPlayer()
  const { width } = useBrowserData()
  const isPlaying = !isEmptyObj(curPlay)
  const { t, i18n } = useTranslation()
  const lng = i18n.language

  const handleHistoryClick = (obj) => {
    const useLevel0 = obj?.ep?.topIdStr
    console.log(obj)
    console.log(useLevel0)
    const useCh = obj?.ep?.id
    const useBk = obj?.ep?.bk
    const langID = obj?.ep?.langID || obj?.ep?.lang
    const curSerie = {
      ...getSerie(langID,useLevel0),
      language: langID,
    }
    console.log(curSerie)
    const serNType = serieNaviType(useLevel0)
    if ((serNType === "audioBible") || (serNType === "videoSerie") || (serNType === "videoPlan")) {
      const useLang = langID
      curSerie.title = (useCh!=null) ? getOsisChTitle(useBk,useCh,useLang) : undefined
      const epObj = {
        ...obj?.ep,
        title: `${t(useBk,{useLang})} ${useCh}`
      }
      startPlay(useLevel0,useCh,curSerie,epObj)
    } else if (serieNaviType(useLevel0) === "audioStories") {
      startPlay(useLevel0,useCh,curSerie,obj?.ep)
    }
  }

  const getChIcon = (key,lev1,lev2,bookObj,ch,lng) => {
    let checkIcon = "000-" + pad(lev1)
    if (lev2!=null) checkIcon = "00-" + pad(lev1) + lev2
    let imgSrc
    let checkTitle
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
          const firstId = pad(parseInt(useCh))
          const firstEntry = checkObj[useCh][0]
          checkIcon = osisIconId[bk] + "_" + firstId + "_" + firstEntry
        }
      }
// Book Icon - To Do - to be added in the future
//    imgSrc = preBook +getOsisIcon(bk) +".png"
      checkTitle = t(bk, { lng })
    } else {
      checkTitle = t(checkIcon, { lng })
    }
    imgSrc = preNav +checkIcon +".png"
    let title = (ch!=null) ? getOsisChTitle(bk,ch,lng) : checkTitle
    let subtitle
    if (bk==null){ // level 1 and 2
      const checkStr = checkIcon + "-descr"
      subtitle = t(checkStr, { lng })
      if (subtitle===checkStr) subtitle = ""
    } else if (ch==null){ // level 3
      const {beg,end} = bookObj
      if ((beg!=null)&&(end!=null)){
        subtitle = (beg===end) ? beg : beg + " - " + end
      }
      const choiceTitle = getChoiceTitle(bk,key+1,lng)
      if (choiceTitle!=null) {
        title += " " + subtitle
        subtitle = choiceTitle
      }
    }
    return {
      imgSrc,
      key,
      subtitle,
      title,
      isBookIcon: false
    }
  }
  
  const dailyList = navHist && Object.keys(navHist).filter(key => {
    const navObj = navHist[key]
    const useLevel0 = navObj?.topIdStr
    return (serieNaviType(useLevel0) === "videoPlan")     
  }).map(key => {
    const navObj = navHist[key]
    const useLevel0 = navObj?.topIdStr
    const useLng = serieLang(useLevel0)
    return {
      key,
      id: key,
      image: navObj.image,
      langID: useLng,
      title: t(navObj.title, { lng: useLng }),
      descr: t(navObj.descr, { lng: useLng }),
      ep: navHist[key]
    }
  })

  const myList = navHist && Object.keys(navHist).filter(key => {
    const navObj = navHist[key]
    const useLevel0 = navObj?.topIdStr
    return (
      (serieNaviType(useLevel0) === "audioBible") 
      || (serieNaviType(useLevel0) === "audioStories")
      || (serieNaviType(useLevel0) === "videoSerie")
    )
  }).map(key => {
    const navObj = navHist[key]
    const useLevel0 = navObj?.topIdStr
    const serNType = serieNaviType(useLevel0)
    // if ((useLevel0 === "en-audio-bible-WEB") || (useLevel0 === "de-audio-bible-ML")) {
    if (serNType === "audioBible") {
      const useLevel1 = navObj?.bookObj?.level1
      const useLevel2 = navObj?.bookObj?.level2
      const useBObj = navObj?.bookObj
      const useCh = navObj?.id
      const epObj = getChIcon(useCh,useLevel1,useLevel2,useBObj,useCh,serieLang(useLevel0))
      return {
        key,
        id: key,
        imageSrc: epObj.imgSrc,
        title: epObj.title,
        descr: `${navObj.bk} ${navObj.id}`, // epObj.subtitle,
        ep: navHist[key]
      }
    } else if (serNType === "audioStories") {
      return {
        key,
        id: key,
        imageSrc: navObj?.image?.filename,
        title: navObj.title,
        descr: navObj.subtitle,
        ep: navHist[key]
      }  
    } else if ((serNType === "videoSerie") || (serNType === "videoPlan")) {
      const useLng = serieLang(useLevel0)
      return {
        key,
        id: key,
        image: navObj.image,
        title: t(navObj.title, { lng: useLng }),
        descr: t(navObj.descr, { lng: useLng }),
        ep: navHist[key]
      }
    }
  }) || []
  let showSyncImage = false
  if (isPlaying) {
    const curMediaType = curPlay?.curSerie?.mediaType
    showSyncImage = (curMediaType==="audio") || (curMediaType==="bible")
  }
  const getExtFilename = (fname) => (fname) && fname?.slice((fname?.lastIndexOf(".") - 1 >>> 0) + 2)
  const isVideoSrc = (getExtFilename(syncImgSrc)?.toLowerCase() === 'mp4')
  return (
    <div>
      {(!isPlaying) && (<Typography
        type="title"
      >Today</Typography>)}
      {(!isPlaying) && dailyList && (dailyList.length>0) && (
        <BibleviewerApp topIdStr={dailyList[0].topIdStr} lng={dailyList[0].langID}/>
      )}
      {(showSyncImage) && (
      <>
        <ImageList
          rowHeight={"auto"}
          cols={1}
        >
          <ImageListItem key="1">
            {!isVideoSrc && <img src={syncImgSrc} />}
            {isVideoSrc && (<video autoPlay loop muted playsInline
              aria-labelledby="video-label"
              width={width}
              src={syncImgSrc}
            />)}
            {/* <div id="video-label" aria-hidden="true">
              (alternative text)
            </div>             */}
          </ImageListItem>
        </ImageList>
        <Typography
          type="title"
        >{syncVerseText}<br/><br/></Typography>
      </>)}
      {(!isPlaying) && (
        <Grid container alignItems="center" spacing={2}>
          <Grid item>
            {(myList.length>0) && (<Typography
              type="title"
              style={{paddingTop: 25}}    
            >Continue</Typography>)}
            {(myList.length>0) && (
              <HistoryView
                onClick={(item) => handleHistoryClick(item)} 
                epList={myList}
                lng={lng}
              />      
            )}
          </Grid>
        </Grid>
      )}
    </div>
  )
}

export default HomeView
