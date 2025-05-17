import React from 'react'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import PlayArrow from '@mui/icons-material/PlayArrow'
import ItemImage from './item-image'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { useTranslation } from 'react-i18next'

const NewlineText = ({text}) => text.split('\n').map((line,i) => (
  <span key={i}>
    {line}
    <br/>
  </span>
))

const InfoTileItem = ({item,curEp,expanded,mTop,onClickPlay,onClickExpand,lng}) => {
  const { t } = useTranslation()
  const expandIcon = expanded ? <ExpandLessIcon/> : <ExpandMoreIcon/>
  return (
    <Box>
      <Grid container alignItems="center" spacing={2}>
        <Grid item>
          <ItemImage
            item={item}
            curEp={curEp}
            onClick={(e) => onClickPlay(e)}
            width={"100%"}
            float={"left"}
            mTop={mTop}
          />
        </Grid>
        <Grid item>
          <Typography
            sx={{pl: 0.5, pt: 1.5,fontWeight: 600,fontSize: '110%'}}
          >
            {t(item.title,{lng})}
          </Typography>
        </Grid>
        <Grid item>
          {(item && item.episodeList && item.episodeList.length>1) && (<IconButton
            sx={{color: 'white',backgroundColor: '#242424'}}
            onClick={(e) => onClickExpand(e)}>
              {expandIcon}
          </IconButton>)}
        </Grid>
        <Grid item>
          <IconButton
            sx={{color: 'blue',backgroundColor: 'darkgrey'}}
            onClick={(e) => onClickPlay(e)}>
            <PlayArrow/>
          </IconButton>
        </Grid>
      </Grid>
      {expanded && <Typography sx={{pt: 0.5,fontWeight: 100,fontSize: '85%',width: '100%'}}><NewlineText text={t(item.description,{lng})}/></Typography>}
      {curEp && <Typography sx={{pl: 0.5, pt: 1,fontWeight: 600,fontSize: '90%'}}>{t(curEp.title,{lng})}</Typography>}
      {curEp && curEp.descr && (t(curEp.descr,{lng}) !== curEp.descr) && <Typography sx={{pt: 0.5,fontWeight: 100,fontSize: '85%',width: '100%'}}><NewlineText text={t(curEp.descr,{lng})}/></Typography>}
      <div/>
    </Box>
  )
}

export default InfoTileItem
