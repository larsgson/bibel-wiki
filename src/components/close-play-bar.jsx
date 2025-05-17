import React from 'react'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import NavClose from '@mui/icons-material/Close'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import useMediaPlayer from "../hooks/useMediaPlayer"

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

const ClosePlayAppBar = (props) => {
  const { t } = useTranslation()
  const { onStopPlaying } = useMediaPlayer()
  return (
    <AppBar
      sx={{ background: 'transparent', boxShadow: 'none'}}
    >
      <Toolbar>
        <div style={{ width: '100%' }}>
          <Box sx={{
              display: 'flex',
              justifyContent: 'space-between',
              p: 1,
              m: 1,
            }}>
            <Item>
            </Item>
            <Item>
            </Item>
            <Item>
              <IconButton
                sx={{color: 'white',backgroundColor: 'darkgrey'}}
                onClick={() => onStopPlaying()}>
                <NavClose/>
              </IconButton>
            </Item>
          </Box>
        </div>
      </Toolbar>
    </AppBar>
  )
}

export default ClosePlayAppBar
