import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import ImageList from '@mui/material/ImageList'
import ImageListItem from '@mui/material/ImageListItem'
import { pad, isEmptyObj } from '../utils/obj-functions'
import { obsTitles } from '../constants/obsHierarchy'
import { osisIconId, osisIconList } from '../constants/osisIconList'
import { getOsisChTitle, getChoiceTitle } from '../constants/osisChTitles'
import useMediaPlayer from "../hooks/useMediaPlayer"
import BibleviewerApp from './bible-viewer-app'
import HistoryView from './history-view'
import { useSerie, serieLang, serieNaviType } from '../utils/dynamic-lang'

const topObjList = {
  "de-jhn-serie": {
    title: "Das Johannesevangelium",
    imgSrc: "/navIcons/VB-John1v1.png",
    subtitle: "Videoserie"
  },
  "en-jhn-serie": {
    title: "Gospel of John",
    imgSrc: "/navIcons/VB-John1v1.png",
    subtitle: "Video serie"
  },
  "de-jhn-plan": {
    title: "Das Johannesevangelium",
    imgSrc: "/navIcons/VB-John1v3.png",
    subtitle: "täglich - in 90 Tagen"
  },
  "en-jhn-plan": {
    title: "Gospel of John",
    imgSrc: "/navIcons/VB-John1v3.png",
    subtitle: "daily - in 90 days"
  },
  "de-audio-bible-ML": {
    title: "Hörbibel",
    imgSrc: "/navIcons/40_Mt_03_08.png",
    subtitle: "einfach zum Navigieren"
  },
  "en-audio-bible-WEB": {
    title: "Audio Bible",
    imgSrc: "/navIcons/40_Mt_08_12.png",
    subtitle: "with easy navigation"
  },
  "en-audio-OBS": {
    title: "Audio Bible Stories",
    imgSrc: "/navIcons/Bible_NT.png",
    subtitle: "with easy navigation"
  }
}

const HomeView = (props) => {
  // eslint-disable-next-line no-unused-vars
  const { navHist, startPlay, curPlay, syncImgSrc } = useMediaPlayer()
  const isPlaying = !isEmptyObj(curPlay)
  const { t } = useTranslation()
  const { onStartPlay } = props

  const [level0, setLevel0] = useState()
  const [level2, setLevel2] = useState("")
  const [skipLevelList,setSkipLevelList] = useState([])
  const preNav = "/navIcons/"

  const navigateUp = (level) => {
    if (skipLevelList.includes(level)) {
      navigateUp(level-1)
    } else {
      setCurLevel(level)
      if (level===0) setLevel0("audioBible")
    }
  }

  const handleHistoryClick = (obj) => {
    const useLevel0 = obj?.ep?.topIdStr
    setLevel0(useLevel0)
    const curSerie = {...useSerie[useLevel0], language: serieLang[useLevel0] }
    if (serieNaviType[useLevel0] === "audioBible") {
      setLevel1(obj?.ep?.bookObj?.level1)
      setLevel2(obj?.ep?.bookObj?.level2)
      setLevel3(obj?.ep?.bookObj?.level3)
      setCurLevel(4)
      const bObj = obj?.ep?.bookObj
      onStartPlay(useLevel0,curSerie,bObj,obj?.ep?.id)
    } else if (serieNaviType[useLevel0] === "audioStories") {
      setCurLevel(1)
      startPlay(useLevel0,obj?.ep?.id,curSerie,obj?.ep)
    } else if (serieNaviType[useLevel0] === "videoSerie") {
      setCurLevel(1)
      startPlay(useLevel0,obj?.ep?.id,curSerie,obj?.ep)
    }
  }

  const getChIcon = (key,lev1,lev2,bookObj,ch) => {
    let checkIcon = "000-" + pad(lev1)
    if (lev2!=null) checkIcon = "00-" + pad(lev1) + lev2
    let imgSrc
    let checkTitle
    const lng = serieLang[level0]
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
      subtitle = t(checkStr, { lng: serieLang[level0] })
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
  
  const naviType = serieNaviType[level0] || "audioBible"
  const lng = serieLang[level0]
  const myList = navHist && Object.keys(navHist).filter(key => {
    const navObj = navHist[key]
    const useLevel0 = navObj?.topIdStr
    return (
      (serieNaviType[useLevel0] === "audioBible") 
      || (serieNaviType[useLevel0] === "audioStories")
      || (serieNaviType[useLevel0] === "videoSerie")
    )
  }).map(key => {
    const navObj = navHist[key]
    const useLevel0 = navObj?.topIdStr
    // if ((useLevel0 === "en-audio-bible-WEB") || (useLevel0 === "de-audio-bible-ML")) {
    if (serieNaviType[useLevel0] === "audioBible") {
      const useLevel1 = navObj?.bookObj?.level1
      const useLevel2 = navObj?.bookObj?.level2
      const useBObj = navObj?.bookObj
      const useCh = navObj?.id
      const epObj = getChIcon(useCh,useLevel1,useLevel2,useBObj,useCh)
      return {
        key,
        id: key,
        imageSrc: epObj.imgSrc,
        title: epObj.title,
        descr: epObj.subtitle,
        ep: navHist[key]
      }
    } else if (serieNaviType[useLevel0] === "audioStories") {
      return {
        key,
        id: key,
        imageSrc: navObj?.image?.filename,
        title: navObj.title,
        descr: navObj.subtitle,
        ep: navHist[key]
      }  
    } else if (serieNaviType[useLevel0] === "videoSerie") {
      const useLng = serieLang[useLevel0]
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
  return (
    <div>
      {(!isPlaying) && (
        <Grid container alignItems="center" spacing={2}>
          <Grid item>
            {(myList.length>0) && (<Typography
              type="title"
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
      {(!isPlaying) && (naviType==="audioBible") && (<Typography
        type="title"
      >Today</Typography>)}
      {(!isPlaying) && (naviType==="audioBible") && (
        <BibleviewerApp topIdStr={level0} lng={"en"}/>
      )}
      {((naviType==="audioStories") || (naviType==="audioBible")) && (isPlaying) && (
      <>
        <Typography
          type="title"
        >{obsTitles[level2-1]}</Typography>
        <ImageList
          rowHeight={"auto"}
          cols={1}
        >
          <ImageListItem key="1">
            <img src={syncImgSrc} />
          </ImageListItem>
        </ImageList>
        <Typography
          type="title"
        ><br/><br/></Typography>
      </>)}
    </div>
  )
}

export default HomeView
