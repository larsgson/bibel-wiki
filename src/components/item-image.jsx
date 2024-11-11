import React from "react"
import LazyLoad from 'react-lazyload'
import { getImgOfObj } from '../utils/obj-functions'
import { useTranslation } from 'react-i18next'
import PlayCircleOutlinedIcon from '@mui/icons-material/PlayCircleOutlined'
import IconButton from '@mui/material/IconButton'

const ItemImage = (props) => {
  const {item,curEp,onClick,mTop} = props
  const { t } = useTranslation()
  let useImage = getImgOfObj(item,t)
  if (curEp && curEp.image) useImage = getImgOfObj(curEp,t)
  return (
    <LazyLoad height={props.height}>
      <div
        onClick={(ev) => onClick(ev)}
        style={{cursor: "default"}}
      >
        <img
          src={useImage}
          alt={item.title}
          style={{
            width: props.width,
            height: props.height,
            float: props.float,
            marginTop: mTop
          }}
        />
        <div/>
        <IconButton
            onClick={(ev) => onClick(ev)}
            sx={{
              margin: 0,
              left: 'auto',
              position: 'absolute',
              right: '45%',
              top: '35%',
              bottom: 'auto',
              zIndex: 1000,
            }}
          >
            <PlayCircleOutlinedIcon 
              sx={{
                height: 60,
                width: 60,
              }}
            />
          </IconButton>

      </div>
    </LazyLoad>
  )
}

export default ItemImage
