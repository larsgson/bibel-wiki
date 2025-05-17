import React from 'react'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import PlayArrow from '@mui/icons-material/PlayArrow'
import ItemImage from './item-image'
import BiblePlanView from './bible-plan-view'
import DateSelectButton from './date-select-button'
import BiblePlanDatePicker from './bible-plan-date-picker'
import ChevronLeft from '@mui/icons-material/ChevronLeft'
import ChevronRight from '@mui/icons-material/ChevronRight'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { useTranslation } from 'react-i18next'
import useMediaPlayer from "../hooks/useMediaPlayer"
import { isEmptyObj } from '../utils/obj-functions'
import PropTypes from 'prop-types'
import { differenceInCalendarDays } from 'date-fns';
import DailyTeaser from './daily-teaser'

const NewlineText = ({text}) => text.split('\n').map((line,i) => (
  <span key={i}>
    {line}
    <br/>
  </span>
))

function Item(props) {
  const { sx, ...other } = props;
  return (
    <Box
      sx={{
        p: 1,
        m: 1,
        color: (theme) => (theme.palette.mode === 'dark' ? 'grey.300' : 'grey.800'),
        fontSize: '0.875rem',
        fontWeight: '700',
        ...sx,
      }}
      {...other}
    />
  );
}
Item.propTypes = {
  /**
   * The system prop that allows defining system overrides as well as additional CSS styles.
   */
  sx: PropTypes.oneOfType([
    PropTypes.arrayOf(
      PropTypes.oneOfType([PropTypes.func, PropTypes.object, PropTypes.bool]),
    ),
    PropTypes.func,
    PropTypes.object,
  ]),
};

// Navigation up (maybe onClose?)

const PlanEpisode = (props) => {
  const {
    curSerie,
    expanded,
    navigationDate,
    completedList, 
    daysSinceFirst,
    firstDateOfPlan,
    onClickPlay,
    onClickExpand,
    onNewNavigationDate,
    onClickPrev,
    onClickNext,
    lng
  } = props
  const { t } = useTranslation()
  const { curPlay } = useMediaPlayer()
  const isPlaying = !isEmptyObj(curPlay)
  const episodeNumber = differenceInCalendarDays(navigationDate,firstDateOfPlan)
  const curEp = curSerie?.episodeList[episodeNumber]
  const expandIcon = expanded ? <ExpandLessIcon/> : <MenuBookIcon/>
  const [isDatePickerOpen,setIsDatePickerOpen] = React.useState(false)

  const handleDatePickerOpen = (ev) => {
    ev.stopPropagation()
    setIsDatePickerOpen(true)
  }
  const handleDatePickerClose = () => setIsDatePickerOpen(false)
  const handleDatePickerChange = (date) => {
    setIsDatePickerOpen(false)
    onNewNavigationDate && onNewNavigationDate(date)
  }
  const handleClickPlay = (epNum,ser,ep) => {
    if (!isDatePickerOpen && !isPlaying) {
      if (onClickPlay) onClickPlay(epNum,ser,ep)
    } else {
      setIsDatePickerOpen(false)
    }
  }
  return (
    <Box onClick={handleDatePickerClose}>
      <Grid container alignItems="center" spacing={2}>
        <Grid item>
          {!isPlaying && (<DailyTeaser
            lng={lng}
            curSerie={curSerie}
            navigationDate={navigationDate}
            daysSinceFirst={daysSinceFirst}
            firstDateOfPlan={firstDateOfPlan}
            dateIcon={isDatePickerOpen ? (
              <BiblePlanDatePicker 
                date={navigationDate}
                completedList={completedList}
                daysSinceFirst={daysSinceFirst}
                firstDateOfPlan={firstDateOfPlan}             
                isOpen={isDatePickerOpen} 
                onClose={handleDatePickerClose}
                onChange={handleDatePickerChange}
              />
            ) : (
              <DateSelectButton 
                navigationDate={navigationDate}
                completedList={completedList}
                daysSinceFirst={daysSinceFirst}
                onDatePickerClick={(ev) => handleDatePickerOpen(ev)}
              />
            )}
            onClickPlay={() => handleClickPlay(episodeNumber,curSerie,curEp)}
          />)}
          {curEp && curEp.descr 
            && <Typography 
                sx={{
                  width: '100%',
                  position: 'relative',
                  top: -15,
                  pl: 1, 
                  pt: 0.5, 
                  fontWeight: 100,
                  fontSize: '85%'
                }}>
              <NewlineText text={t(curEp.descr,{lng})}/>
           </Typography>}
        </Grid>
        <div 
          style={{
            width: '100%',
            position: 'relative',
            top: -15
          }}
        >
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
          }}>
            <Item sx={{p: 0, mb: 0}}>
              {(episodeNumber>0) && (
                <IconButton
                  sx={{color: 'white',backgroundColor: 'transparent', p: 0, ml: 1, mb: 0}}
                  onClick={() => onClickPrev()}>
                  <ChevronLeft/>
                </IconButton>
              )}
            </Item>
            <Item sx={{p: 0, mb: 0}}>
            {(episodeNumber<daysSinceFirst) && (
              <IconButton
                sx={{color: 'white',backgroundColor: 'transparent', p: 0, mb: 0}}
                onClick={() => onClickNext()}>
                <ChevronRight/>
              </IconButton>
            )}
            </Item>
          </Box>
        </div>
      </Grid>
      <Grid container alignItems="center" spacing={2}>
        <Grid item>
          <IconButton
            sx={{ml: 3, mt: 2, color: 'black',backgroundColor: 'darkgrey'}}
            onClick={() => onClickExpand(episodeNumber)}>
              {expandIcon}
          </IconButton>
        </Grid>
        {!isPlaying && (
          <Grid item>
            <IconButton
              sx={{ml: 3, mt: 2, color: 'darkblue',backgroundColor: 'darkgrey'}}
              onClick={() => handleClickPlay(episodeNumber,curSerie,curEp)}>
              <PlayArrow/>
            </IconButton>
          </Grid>
        )}
      </Grid>
      {expanded && (
        <div sx={{pt: 0.5,fontWeight: 100,fontSize: '85%',width: '100%'}}>
          <BiblePlanView
            lng={lng}
            curEp={curEp}
          />
          <br/>
          <Grid item>
            {isPlaying && (<ItemImage
              item={curSerie}
              curEp={curEp}
              onClick={() => handleClickPlay(episodeNumber,curSerie,curEp)}
              width={"100%"}
              float={"left"}
              mTop={0}
            />)}
          </Grid>
        </div>
      )}
    </Box>
  )
}

export default PlanEpisode
