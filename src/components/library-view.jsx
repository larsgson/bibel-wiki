import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Typography from '@mui/material/Typography'
import Fab from '@mui/material/Fab'
import Home from '@mui/icons-material/Home'
import ChevronLeft from '@mui/icons-material/ChevronLeft'
import ImageList from '@mui/material/ImageList'
import ImageListItem from '@mui/material/ImageListItem'
import ImageListItemBar from '@mui/material/ImageListItemBar'
import { rangeArray, isEmptyObj } from '../utils/obj-functions'
import { obsTitles } from '../constants/obsHierarchy'
import { getChIcon } from '../utils/icon-handler'
import useBrowserData from '../hooks/useBrowserData'
import useMediaPlayer from "../hooks/useMediaPlayer"
import BibleviewerApp from './bible-viewer-app'
import GospelJohnNavi from './gospel-john-video-navi'
import OBSPictureNavigationApp from './obs-viewer-app'
import { naviSortOrder, chInBook,
          naviBooksLevel1, naviBooksLevel2, naviChapters } from '../constants/naviChapters'
import { getSerie, serieNavLang, serieNaviType } from '../utils/dynamic-lang'
//import KenBurnsImg from './ken-burns-img'

const preNav = "https://storage.googleapis.com/img.bibel.wiki/navIcons/"

const topObjList = {
  "es-jhn-serie": {
    title: "Evangelio de Juan",
    imgSrc: preNav + "VB-John1v1.png",
    subtitle: "Serie de vídeos"
  },
  "es-jhn-plan": {
    title: "Juan",
    imgSrc: preNav + "VB-John1v3.png",
    subtitle: "diariamente - en 90 días"
  },
  "de-jhn-serie": {
    title: "Das Johannesevangelium",
    imgSrc: preNav + "VB-John1v1.png",
    subtitle: "Videoserie"
  },
  "en-jhn-serie": {
    title: "Gospel of John",
    imgSrc: preNav + "VB-John1v1.png",
    subtitle: "Video serie"
  },
  "en-jhn-plan": {
    title: "John",
    imgSrc: preNav + "VB-John1v3.png",
    subtitle: "daily - in 90 days"
  },
  "en-audio-OBS": {
    title: "Audio Bible Stories",
    imgSrc: preNav + "Bible_NT.png",
    subtitle: "with easy navigation"
  }
}

const SerieGridBar = (props) => {
  // eslint-disable-next-line no-unused-vars
  const { classes, title, subtitle } = props
  return (
      <ImageListItemBar
        title={title}
        subtitle={subtitle}
      />
  )
}

const LibraryView = (props) => {
  // eslint-disable-next-line no-unused-vars
  const { size, width } = useBrowserData()
  const { curPlay, syncImgSrc, syncVerseText } = useMediaPlayer()
  const isPlaying = !isEmptyObj(curPlay)
  const { t, i18n } = useTranslation()
  const { onExitNavigation, onStartPlay } = props

  const [curLevel, setCurLevel] = useState(0)
  const [level0, setLevel0] = useState()
  const [level1, setLevel1] = useState(1)
  const [level2, setLevel2] = useState("")
  const [level3, setLevel3] = useState("")
  const [skipLevelList,setSkipLevelList] = useState([])
  // ToDo !!! find a bibleBookList and use this here
  // eslint-disable-next-line no-unused-vars
  const getSort = (val) => naviSortOrder.indexOf(parseInt(val))
  const addSkipLevel = (level) => setSkipLevelList([...skipLevelList,level])

  // eslint-disable-next-line no-unused-vars
  const handleClick = (ev,id,_isBookIcon) => {
    if (curLevel===0) {
      setLevel0(id)
      setCurLevel(1)
    } else if (curLevel===1) {
      setLevel1(id)
      setCurLevel(2)
    } else if (curLevel===2) {
      setLevel2(id)
      if (naviChapters[level1][id].length===1){
        setLevel3(0)
        setCurLevel(4)
      } else setCurLevel(3)  
    } else if (curLevel===3) {
      setLevel3(id)
      setCurLevel(4)
    } else {
      const bookObj = {...naviChapters[level1][level2][level3], level1, level2, level3}
      const curSerie = getSerie(serieNavLang(level0),level0)
      // const {curSerie} = curPlay  
      onStartPlay(level0,curSerie,bookObj,id)
    }
  }

  const navigateUp = (level) => {
    if (skipLevelList.includes(level)) {
      navigateUp(level-1)
    } else {
      setCurLevel(level)
      if (level===0) setLevel0("audioBible")
    }
  }

  const navigateHome = () => {
    setCurLevel(0)
    setLevel0("audioBible")
  }

  const handleReturn = () => {
    if ((curLevel===4)&&(naviChapters[level1][level2].length===1)){
      navigateUp(2)
    } else
    if (curLevel>0){
      navigateUp(curLevel-1)
    } else {
      onExitNavigation()
    }
  }
  const handleClose = () => {
    navigateUp(0)
  }
    
  let validIconList = []
  let validBookList = []
  if (curLevel===0){
    validIconList = Object.keys(topObjList).map((key) => {
      return {
        ...topObjList[key],
        key
      }
    })
  } else if (curLevel===1){
    let lastInx
    const curSerie = getSerie(serieNavLang(level0),level0)
    const curList = (curSerie!=null && curSerie.bibleBookList) ? curSerie.bibleBookList : []
    Object.keys(naviBooksLevel1).sort((a,b)=>getSort(a)-getSort(b)
    ).forEach(iconInx => {
      const foundList = naviBooksLevel1[iconInx].filter(x => curList.includes(x))
      validBookList.push(...foundList)
      if (foundList.length>0){
        lastInx = iconInx
        validIconList.push(getChIcon(iconInx,level0,iconInx))
      }
    })
    if (validIconList.length===1) {
      setLevel1(lastInx)
      setCurLevel(2)
      addSkipLevel(1)
      validIconList = []
      validBookList = []
    }
  }
  if (curLevel===2){
    let lastLetter
    const curSerie = getSerie(serieNavLang(level0),level0)
    const curList = (curSerie!=null) ? curSerie.bibleBookList : []
    Object.keys(naviChapters[level1]).forEach(iconLetter => {
      const foundList = naviBooksLevel2[level1][iconLetter].filter(x => curList.includes(x))
      validBookList.push(...foundList)
      if (foundList.length>0) {
        lastLetter = iconLetter
        validIconList.push(getChIcon(iconLetter,level0,level1,iconLetter))
      }
    })
    if (validIconList.length===1) {
      setLevel2(lastLetter)
      setCurLevel(3)
      addSkipLevel(2)
      validIconList = []
      validBookList = []
    }
  }
  if (curLevel===3){
    naviChapters[level1][level2].forEach((bookObj,i) => {
      validIconList.push(getChIcon(i,level0,level1,level2,bookObj))
    })
  } else if (curLevel===4){
    const bookObj = naviChapters[level1][level2][level3]
    const {bk} = bookObj
    if (bk!=null){
      if (bookObj.beg==null) bookObj.beg = 1
      if (bookObj.end==null) bookObj.end = chInBook[bk]
      const {beg,end} = bookObj
      rangeArray(beg,end).forEach(ch => {
        validIconList.push(getChIcon(ch,level0,level1,level2,bookObj,ch))
      })
    }
  }
  const lng = serieNavLang(level0)
  let useCols = 3
  if (size==="xs") useCols = 2
  else if (size==="lg") useCols = 4
  else if (size==="xl") useCols = 5
  const rootLevel = (curLevel===0)
  const naviType = serieNaviType(level0) || "audioBible"
  const serID = curPlay?.curSerie?.uniqueID
  const isVideoSrc = (serID === "uW.OBS.en")
  return (
    <div>
      {(naviType==="audioBible") && (!isPlaying) && (curLevel>1) && (
        <Fab
          onClick={navigateHome}
          // className={largeScreen ? classes.exitButtonLS : classes.exitButton}
          color="primary"
        >
          <Home/>
        </Fab>
      )}
      {!rootLevel && (!isPlaying) && (naviType==="audioBible") && (
        <Fab
          onClick={handleReturn}
          // className={largeScreen ? classes.exitButtonLS : classes.exitButton}
          color="primary"
        >
          <ChevronLeft />
        </Fab>
      )}
      {(naviType==="videoPlan") && <BibleviewerApp onClose={handleClose} topIdStr={level0} lng={lng}/>}
      {(naviType==="videoSerie") && <GospelJohnNavi onClose={handleClose} topIdStr={level0} lng={lng}/>}
      {(naviType==="audioStories") && (!isPlaying) && <OBSPictureNavigationApp topIdStr={level0} onClose={handleClose}/>}
      {(naviType==="audioBible") && (!isPlaying) && (<ImageList
        rowHeight="auto"
        cols={useCols}
      >
        {validIconList.map(iconObj => {
          const {key,imgSrc,title,subtitle,isBookIcon} = iconObj
          return (
            <ImageListItem
              onClick={(ev) => handleClick(ev,key,isBookIcon)}
              key={key}
            >
              <img
                src={imgSrc}
                alt={title}/>
              <SerieGridBar
                title={title}
                subtitle={subtitle}
              />
            </ImageListItem>
          )
        })}
        </ImageList>
      )}
      {((naviType==="audioStories") || (naviType==="audioBible")) && (isPlaying) && (
      <>
        <Typography
          type="title"
        >{obsTitles[level2-1]}</Typography>
        <ImageList
          rowHeight={width / 1.77}
          cols={1}
        >
          <ImageListItem
            onClick={(ev) => handleClick(ev,"1",false)}
            key="1"
          >
            {(!isVideoSrc) && <img src={syncImgSrc} />}
            {(isVideoSrc) && (<video autoPlay loop muted playsInline
              aria-labelledby="video-label"
              width={width}
              src={syncImgSrc}
            />)}
          </ImageListItem>
        </ImageList>
        <Typography
          type="title"
        >{syncVerseText}<br/><br/></Typography>
      </>)}
    </div>
  )
}

export default LibraryView
