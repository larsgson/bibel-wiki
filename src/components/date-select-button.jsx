import React from 'react'
import Button from '@mui/material/Button'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import Badge from '@mui/material/Badge'
import { format } from 'date-fns';
import { de } from 'date-fns/locale/de';

const DateSelectButton = (props) => {
  const {
    navigationDate,
    completedList, 
    daysSinceFirst,
    onDatePickerClick
  } = props
  const uncompletedEpisodes = daysSinceFirst - completedList?.length

  return (
    <div>
      <Button 
        variant="outlined" 
        onClick={onDatePickerClick}
        sx={{minWidth:120, color:'white', borderColor:'white', p: 0}}

        endIcon={(
          <Badge 
            badgeContent={(uncompletedEpisodes > 0) ? uncompletedEpisodes : undefined} 
            color="secondary"
          >
            <CalendarMonthIcon size="small"
            />
          </Badge>
        )}
      >
        {format(navigationDate,"d MMM", {locale: de})}
      </Button>
    </div>
  )
}

export default DateSelectButton
