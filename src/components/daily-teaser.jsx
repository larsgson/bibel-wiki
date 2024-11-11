import React from 'react'
import ImageList from '@mui/material/ImageList'
import ItemBar from './item-bar'
import { useTranslation } from 'react-i18next'
import ItemImage from './item-image'
import ImageListItem from '@mui/material/ImageListItem'
import { differenceInCalendarDays } from 'date-fns'

const DailyTeaser = (props) => {
  const {
    curSerie,
    navigationDate,
    firstDateOfPlan,
    onClickPlay,
    dateIcon,
    lng
  } = props
  const { t } = useTranslation()
  const episodeNumber = differenceInCalendarDays(navigationDate,firstDateOfPlan)
  const curEp = curSerie?.episodeList[episodeNumber]
  const handleClickPlay = (epNum,ser,ep) => {
    if (onClickPlay) onClickPlay(epNum,ser,ep)
  }
  return (
     <ImageList
        cellheight={40}
        cols={1}
      >
      <ImageListItem
        key={curEp?.id}
        cols={1}
        rows={1}
        onClick={(ev) => handleClickPlay(episodeNumber,curSerie,curEp)}
      >
          <ItemImage
            item={curSerie}
            curEp={curEp}
            onClick={() => handleClickPlay(episodeNumber,curSerie,curEp)}
            width={"100%"}
            float={"left"}
            mTop={0}
          />
        <ItemBar
          title={t(curEp?.title,{lng})}
          descr={t(curSerie?.title,{lng}) + ` ${curEp?.begin?.ch},${curEp?.begin?.v}-${curEp?.end?.v}`}
          dateIcon={dateIcon}
          // useIcon={useIcon}
          // bkgrd={bkgrd}
          // percentVal={percentVal}
          onClick={(e) => handleClickPlay(episodeNumber,curSerie,curEp)}
        />
      </ImageListItem>
    </ImageList>
  )
}

export default DailyTeaser
