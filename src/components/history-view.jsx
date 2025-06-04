import React, {useState} from 'react'
import CardContent from '@mui/material/CardContent'
import ImageList from '@mui/material/ImageList'
import ImageListItem from '@mui/material/ImageListItem'
import Typography from '@mui/material/Typography'
import { getChFreePicFirstEntry } from '../utils/obj-functions'
import { getImgSrcString } from '../constants/naviChaptersJohn'
import ItemBarEpisode from './item-bar-episode'
import { getImgOfObj } from '../utils/obj-functions'
import useBrowserData from '../hooks/useBrowserData'
import { useTranslation } from 'react-i18next'
import { langWithTimestampsSet } from '../constants/audio-by-b-id'

const HistoryView = (props) => {
  const { epList, lng, onClick } = props
  const { width } = useBrowserData()
  const { t } = useTranslation()
  const handleClickItemIndex = (ev,item) => {
    ev.stopPropagation()
    onClick && onClick(item)
  }
  return (
    <CardContent sx={{padding: 0}}>
      <ImageList
        cellheight={40}
        cols={1}
      >
        {epList?.map((item) => {
          const bookObj = item?.ep?.bookObj
          const useEp = item?.ep
          let useImg = useEp.image ? getImgOfObj(useEp,t) : useEp.imageSrc
          if (bookObj) {
            const checkLang = useEp?.lang 
            if ((bookObj?.bk==="John") && langWithTimestampsSet.has(checkLang)) {
              useImg = getImgSrcString(useEp?.id,1) || getImgSrcString(useEp?.id,2)
            } else {
              const imgObj = getChFreePicFirstEntry(bookObj,useEp?.id)
              useImg = imgObj?.imgSrc
            }
          } 
          return (
            <ImageListItem
              key={item.id}
              cols={1}
              sx={{maxWidth:'500px'}}
              rows={1}
              onClick={(e) => handleClickItemIndex(e,item)}
            >
              <img
                src={useImg}
                alt={item.title}
                onClick={(e) => handleClickItemIndex(e,item)}
                width={"100%"}
                float={"left"}
              />
              <ItemBarEpisode
                // serie={serie}
                episode={item}
                descr={`${item.descr} - (${useEp.langID})`}
                // useIcon={useIcon}
                title={t(item.title,{lng: useEp.langID})}
                onClick={(e) => handleClickItemIndex(e,item)}
              />
              {(width<480) && false && (
                <Typography>{t(item.descr,{lng})}</Typography>)}
            </ImageListItem>
          )}
        )}
      </ImageList>
    </CardContent>
  )
}

export default HistoryView
