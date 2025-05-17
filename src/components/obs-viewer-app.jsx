import React from 'react'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import OBSNavigation from './obs-navigation'
import useMediaPlayer from "../hooks/useMediaPlayer"

const theme = createTheme({
  palette: {
    mode: 'dark',
  },
})

const defaultBackgroundStyle = {
  height: 'auto',
  minHeight: '100vh',
  background: '#181818',
  padding: 0,
  color: 'whitesmoke',
}

const OBSPictureNavigationApp = ({topIdStr,onClose}) => {
  const mPlayObj = useMediaPlayer()
  const { startPlay, isPaused, syncImgSrc } = mPlayObj

  const handleStartBiblePlay = (curSerie,id,level1) => {
    const useInx = id-1
    if (curSerie?.episodeList) {
      if ((useInx>=0) && (useInx<curSerie?.episodeList?.length)) {
        const curEp = {...curSerie.episodeList[useInx],level1}    
        startPlay(topIdStr,id,curSerie,curEp)
      }
    }
  }
return (
    <div style={defaultBackgroundStyle}>
      <ThemeProvider theme={theme}>
        <OBSNavigation
          isPaused={isPaused}
          onReset={() => console.log("onReset")}
          onExitNavigation={onClose}
          onStartPlay={handleStartBiblePlay}
          syncImgSrc={syncImgSrc}
        />
      </ThemeProvider>
    </div>
  )
}

export default OBSPictureNavigationApp
