import React, { useState, useEffect } from 'react'
import PlanEpisode from './plan-episode'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import useMediaPlayer from "../hooks/useMediaPlayer"
import { isEmptyObj } from '../utils/obj-functions'
import useBrowserData from '../hooks/useBrowserData'
import { verseSec } from '../constants/TimeCodes'
import { verseSumCh } from '../constants/naviChaptersJohn'
import { gospelOfJohnObj } from '../constants/naviChaptersJohn'
import { apiSetStorage, apiGetStorage } from '../utils/api'
import { uniqueArray } from '../utils/obj-functions'
import { differenceInCalendarDays, addDays, subDays } from 'date-fns'
import { useTranslation } from 'react-i18next'

const theme = createTheme({
  palette: {
    mode: 'dark',
  },
})

const defaultBackgroundStyle = {
  height: 'auto',
  background: '#181818',
  padding: 0,
  color: 'whitesmoke',
}

const BibleviewerApp = ({topIdStr,lng}) => {
  const { startPlay, curPlay } = useMediaPlayer()
  const { size, width, height } = useBrowserData()
  const { t } = useTranslation()
  const isPlaying = !isEmptyObj(curPlay)
  const [showBiblePassage,setShowBiblePassage] = useState(false)
  const [completedList,setCompletedList] = useState([])
  const curSerie = {...gospelOfJohnObj, language: lng}
  const nbrEpisodes = curSerie.episodeList.length
  const firstDateOfPlan = Date.parse(curSerie.beginDate)
  const dateNow = Date.now()
  const daysDiff = differenceInCalendarDays(dateNow,firstDateOfPlan)
  const daysSinceFirst = daysDiff <= nbrEpisodes ? daysDiff : nbrEpisodes
  const [navigationDate, setNavigationDate] = React.useState(dateNow);
  const viewRatio = width / height
  const missingHeight = viewRatio > (16 / 9)
  const showCloseButton = isPlaying && missingHeight

  useEffect(() => {
    apiGetStorage(`${curSerie.uniqueID}.completed`).then((value) => {
      if (value && value.length>0) setCompletedList(value)
    }).catch((err) => console.error(err))
  },[])

  const localSetCompletedList = (inx) => {
    setCompletedList((prev) => {
      const newList = (prev && prev.length>0) ? uniqueArray([...prev,inx]) : [inx]
      apiSetStorage(`${curSerie.uniqueID}.completed`,newList)
      return newList
    })
  }

  const handleNext = () => {
    setNavigationDate( prev => addDays(prev,1))
    setShowBiblePassage(false)
  }

  const handlePrev = () => {
    setNavigationDate( prev => subDays(prev,1))
    setShowBiblePassage(false)
  }
  
  const handleNewNavigationDate = (newDate) => {
    setNavigationDate(newDate)
    setShowBiblePassage(false)
  }

  const handleShowBiblePassage = (val) => {
    console.log(val)
    setShowBiblePassage(val)
    localSetCompletedList(differenceInCalendarDays(navigationDate,firstDateOfPlan))
  }

  const handlePlay = (inx,curSer,ep) => {
    localSetCompletedList(inx)
    if (startPlay!=null) {
      if (ep?.begin?.ch) { // Episodes with begin and end data
        const tmpEp = ep
        const begCh = tmpEp.begin.ch
        const begVerseNbr = ((begCh>1)?verseSumCh[begCh-2] : 0) + tmpEp.begin.v -1
        const endCh = tmpEp.end.ch
        const endVerseNbr = ((endCh>1)?verseSumCh[endCh-2] : 0) + tmpEp.end.v
        tmpEp.begTimeSec = verseSec[begVerseNbr]
        tmpEp.endTimeSec = verseSec[endVerseNbr]
        startPlay(topIdStr,inx,curSer,tmpEp)
      } else if (ep) { // Assume that these are chapter episodes  
        ep.begTimeSec = verseSec[((ep?.id>0)?verseSumCh[ep?.id-1] : 0)]
        ep.endTimeSec = verseSec[verseSumCh[ep?.id]]
        if (ep) startPlay(topIdStr,inx,curSer,ep)
      }
    }
  }
 
  return (
    <div style={defaultBackgroundStyle}>
      <ThemeProvider theme={theme}>
        <div
          style={{
            width: '100%',
            // float: props.float,
            marginTop: 2
          }}
        >
          <PlanEpisode
            lng={lng}
            curSerie={curSerie}
            expanded={showBiblePassage}
            navigationDate={navigationDate}
            completedList={completedList}
            daysSinceFirst={daysSinceFirst}
            firstDateOfPlan={firstDateOfPlan}  
            // onClickClose={handleClose}
            onClickMenuBookIcon={() => props.onClickMenuBookIcon()}
            onNewNavigationDate={(newDate) => handleNewNavigationDate(newDate)}
            onClickPlay={(inx,curSer,curEp) => handlePlay(inx,curSer,curEp)}
            onClickNext={handleNext}
            onClickPrev={handlePrev}
            onClickExpand={() => handleShowBiblePassage(!showBiblePassage)}
          />
        </div>
      </ThemeProvider>
    </div>
  )
}

export default BibleviewerApp
