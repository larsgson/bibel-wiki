import React, {useState} from 'react'
import CardContent from '@mui/material/CardContent'
import ImageList from '@mui/material/ImageList'
import ImageListItem from '@mui/material/ImageListItem'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import Fab from '@mui/material/Fab'
import { getImgOfObj } from '../utils/obj-functions'
import ItemBarEpisode from './item-bar-episode'
import useBrowserData from '../hooks/useBrowserData'
import useMediaPlayer from "../hooks/useMediaPlayer"
import { useTranslation } from 'react-i18next'
import { verseSec } from '../constants/TimeCodes'
import { verseSumCh } from '../constants/naviChaptersJohn'

const EpList = (props) => {
  const { serie, navButton, useIcon, epList, imgSrc, topIdStr, lng } = props
  const [expanded,setExpanded] = useState(!navButton)
  const {size, width, height} = useBrowserData()
  const { t } = useTranslation()
  const { startPlay } = useMediaPlayer()
  const sizeToCol = {"xl": 5, "lg": 4, "md": 3}
  let colSize = sizeToCol[size] || 2
  let curHeight = height-150
  if (width<=380){
    colSize = 1
    if (curHeight>300){
      curHeight = 300
    }
  }
  const nbrOfEntries = epList && epList.length
  const showNav = navButton && (nbrOfEntries > colSize)
  const showNavButton = showNav && !expanded
  const useColSize = colSize // + (showNavButton ? 0.15 : 0.1)
  const expandIcon = expanded ? <RemoveIcon/> : <AddIcon/>
  const toggleExpand = (ev) => {
    ev.stopPropagation()
    setExpanded(!expanded)
  }
  const handleClickItemIndex = (ev,item,ep) => {
    ev.stopPropagation()
    if (startPlay!=null) {
      if (ep?.begin?.ch) { // Episodes with begin and end data
        const tmpEp = ep
        const begCh = tmpEp.begin.ch
        const begVerseNbr = ((begCh>1)?verseSumCh[begCh-2] : 0) + tmpEp.begin.v -1
        const endCh = tmpEp.end.ch
        const endVerseNbr = ((endCh>1)?verseSumCh[endCh-2] : 0) + tmpEp.end.v
        tmpEp.begTimeSec = verseSec[begVerseNbr]
        tmpEp.endTimeSec = verseSec[endVerseNbr]
        startPlay(topIdStr,0,item,tmpEp)
      } else { // Assume that these are chapter episodes  
        ep.begTimeSec = verseSec[((ep.id>0)?verseSumCh[ep.id-1] : 0)]
        ep.endTimeSec = verseSec[verseSumCh[ep.id]]
        startPlay(topIdStr,0,item,ep)
      }
    }
  }
  const iconList = serie.iconList
  return (
    <CardContent sx={{padding: 0}}>
      <ImageList
        cellheight={iconList? 40 : undefined}
        cols={useColSize}
      >
        {epList?.map((ep) => {
          const useImg = ep.image ? getImgOfObj(ep,t) : imgSrc
          return (
            <ImageListItem
              key={ep.id}
              cols={1}
              rows={1}
              onClick={(ev) => handleClickItemIndex(ev,serie,ep)}
            >
              <img
                src={useImg}
                alt={ep.title}
                onClick={(ev) => handleClickItemIndex(ev,serie,ep)}
              />
              <ItemBarEpisode
                serie={serie}
                episode={ep}
                useIcon={useIcon}
                title={t(ep.title,{lng})}
                onClick={(ev) => handleClickItemIndex(ev,serie,ep)}/>
              {(width<480) && false && (
                <Typography>{t(ep.descr,{lng})}</Typography>)}
            </ImageListItem>
          )}
        )}
      </ImageList>
      {showNavButton && (<Fab
        onClick={(ev) => toggleExpand(ev)}>{expandIcon}</Fab>)}
    </CardContent>
  )
}

export default EpList
