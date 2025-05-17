import React, {useState,useEffect} from 'react'
import EpList from './ep-list'
import InfoTileItem from './info-tile-item'
import { getImgOfObj } from '../utils/obj-functions'
import { apiObjGetStorage } from '../utils/api'
import useBrowserData from '../hooks/useBrowserData'
import useMediaPlayer from "../hooks/useMediaPlayer"
import { useTranslation } from 'react-i18next'

const TileItem = (props) => {
  const {item,epList,expanded,mTop,topIdStr,lng} = props
  const {width, height} = useBrowserData()
  const {curPlay} = useMediaPlayer()
  const { t } = useTranslation()
  const [serieCurEp, setSerieCurEp] = useState(undefined)
  const [percentVal, setPercentVal] = useState(undefined)
  const [nbrOfEp,setNbrOfEp] = useState(undefined)
  const [curEpInx,setCurEpInx] = useState(undefined)
  const [epDescr, setEpDescr] = useState(undefined)
  useEffect(() => {
    // Initial default
    setPercentVal(0)
    setEpDescr("")
  }, [])
  useEffect(() => {
    if (nbrOfEp!=null && curEpInx!=null) {
      setPercentVal((curEpInx>0)? curEpInx*100/nbrOfEp : undefined)
    }
  }, [nbrOfEp,curEpInx])
  useEffect(() => {
    const subtitleStyle = {
      whiteSpace: 'unset',
      textOverflow: 'clip',
    }
    if (serieCurEp!=null && nbrOfEp>1) {
      let tempEpDescr = serieCurEp.id+1
      if (serieCurEp.title!=null) {
        tempEpDescr = t(serieCurEp.title,{lng})
      }
      setEpDescr(<div style={subtitleStyle}><br/>{tempEpDescr}</div>)
    }
  }, [serieCurEp,nbrOfEp])
  useEffect(() => {
    let didCancel = false
    if (item){
// ToDo: Change this to use the "id" field here instead of the "title"
      if (curPlay && (curPlay.curSerie) && (curPlay.curSerie.title===item.title) && (curPlay.curEp!=null)){
        setSerieCurEp(curPlay.curEp)
      } else {
        if (item.episodeList!=null) {
          if ((item.episodeList.length>1) && (!didCancel)) {
            setNbrOfEp(item.episodeList.length)
          }
        }
        let tmpEp = undefined
        apiObjGetStorage({curSerie: item},"curEp").then((value) => {
          if (!didCancel) {
            if ((item!=null) && (item.episodeList!=null)
                 && (value!=null)
                 && (item.episodeList[value]!=null)) {
              tmpEp=item.episodeList[value]
              setCurEpInx(value)
            }
            setSerieCurEp(tmpEp)
          }
        }).catch((err) => console.error(err))
      }
    }
    return () => {
      didCancel = true
    }
  }, [item,curPlay])
  return (
  <div>
    <InfoTileItem
      lng={lng}
      item={item}
      curEp={serieCurEp}
      mTop={mTop}
      expanded={expanded}
      onClickClose={(e) => props.onClickClose(e)}
      onClickMenuBookIcon={(e) => props.onClickMenuBookIcon(e)}
      onClickPlay={(e) => props.onClickPlay(e,serieCurEp)}
      onClickExpand={(e) => props.onClickExpand(e)}
    />
    <EpList
      lng={lng}
      topIdStr={topIdStr}
      epList={epList}
      multiRow
      onClick={(ev,ser,ep) => console.log(ep)}
      serie={item}
      isPaused={false}
      useHeight={height}
      width={width}
      imgSrc={getImgOfObj(item,t)}/>
  </div>
  )
}

export default TileItem
