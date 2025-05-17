import React from 'react'
import ImageListItemBar from '@mui/material/ImageListItemBar'
import LinearProgress from '@mui/material/LinearProgress'

const ItemProgressBar = ({value}) => (
  <LinearProgress
    variant="determinate"
    color="secondary"
    sx={{
      backgroundColor: 'rgba(255,255,255,0.2)',
      color: 'red',
    }}
    value={value}/>
)

const ItemBar = ({title, hideTitle, descr, percentVal,dateIcon}) => {
  const useTitle = !hideTitle || (percentVal>0)
  return (
    <ImageListItemBar
      title={useTitle?title:""}
      subtitle={(<div>
                    {percentVal && (<ItemProgressBar value={percentVal}/>)}{descr}
                </div>)}
      actionIcon={dateIcon}                
      sx={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0) 100%)'}}
    />
  )
}

export default ItemBar
