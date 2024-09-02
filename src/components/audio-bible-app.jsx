import React, {useState} from 'react'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import BibleNavigation from './bible-navigation'
import useMediaPlayer from '../hooks/useMediaPlayer'

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

// !!! ToDo: Fix Johannes Hörbibel click !

const AudioBibleNavigationApp = () => {
  // eslint-disable-next-line no-unused-vars
  const { curPlay, startPlay } = useMediaPlayer()
  const handleStartBiblePlay = (curSerie,bookObj,id) => {
    const {bk} = bookObj
    const curEp = {bibleType: true,bk,id}
    startPlay(id,curSerie,curEp)
  }
  return (
    <div style={defaultBackgroundStyle}>
      <ThemeProvider theme={theme}>
        <BibleNavigation
          //      isPaused={isPaused}
          onReset={() => console.log("onReset")}
          onExitNavigation={() => console.log("onExitNavigation")}
          onStartPlay={handleStartBiblePlay}
          onClickGospelJohn={() => setGospelJohn(true)}
        />
      </ThemeProvider>
    </div>
  )
}

export default AudioBibleNavigationApp
