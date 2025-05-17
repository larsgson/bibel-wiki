import React, { useState } from 'react'
import TileItem from './tile-item'
import CustomAppBar from './app-bar'
import { gospelOfJohnObj } from '../constants/naviChaptersJohn'
import useMediaPlayer from "../hooks/useMediaPlayer"

const GospelJohnNavi = ({onClose, topIdStr, lng}) => {
  const { startPlay } = useMediaPlayer()
  const [showDescr,setShowDescr] = useState(false)
  const handleShowDescr = (ev,val) => {
    ev.stopPropagation()
    setShowDescr(val)
  }
  const curObj = {...gospelOfJohnObj, language: lng}
  const handleClose = () => onClose && onClose()
  const handlePlay = (ev,curSerEp) => {
    ev.stopPropagation()
    if (startPlay!=null) {
      startPlay(topIdStr,0,curObj,curSerEp)
    }
  }
  const showEpList = curObj.episodeList
  return (
    <div>
      <CustomAppBar onClose={handleClose} lng={lng}/>
      <TileItem
        item={curObj}
        topIdStr={topIdStr}
        mTop={0}
        lng={lng}
        expanded={showDescr}
        infoTile={true}
        epList={showEpList}
        onClickPlay={(e,curSerieEp) => handlePlay(e,curSerieEp)}
        onClickExpand={(e) => handleShowDescr(e,!showDescr)}
      />
    </div>
  )
}

export default GospelJohnNavi
