import {useState} from 'react';
import { useTranslation } from 'react-i18next'
// import { navLangList } from '../constants/languages'
import SimpleAppBar from './simple-app-bar'
import ImageList from '@mui/material/ImageList'
import ImageListItem from '@mui/material/ImageListItem'
import ImageListItemBar from '@mui/material/ImageListItemBar'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CheckIcon from '@mui/icons-material/Check'
import CssBaseline from '@mui/material/CssBaseline';
import Toolbar from '@mui/material/Toolbar';
import { cCode } from '../constants/country-codes'
import useBrowserData from '../hooks/useBrowserData'
import useMediaPlayer from '../hooks/useMediaPlayer'

const navLangList = {
  deu:{en:"German",n:"Deutsch"},
  fre:{en:"French",n:"Français"},
  spa:{en:"Spanish",n:"Español"},
  eng:{en:"English",n:"English"},
}

const LangGridBar = (props) => {
  // eslint-disable-next-line no-unused-vars
  const { classes, title, subtitle } = props
  return (
      <ImageListItemBar
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        // p: 1,
        // m: 1,
      }}
        // title={<Typography sx={{ fontSize: '12px' }}>{title}</Typography>}
        title={title}
        subtitle={subtitle}
      />
  )
}

const capitalizeFirstLetter = ([ first='', ...rest ]) => [ first.toUpperCase(), ...rest ].join('')

const getNameLabel = (nameObj) => {
  let label = ""
  if ((nameObj?.en) && (nameObj?.en === nameObj?.n)) {
    label = nameObj?.n
  } else if ((nameObj?.n) && (nameObj?.en)) {
    label = `${nameObj?.n} - ${nameObj?.en}`
  } else if (nameObj?.n) {
    label = nameObj?.n
  } else {
    label = nameObj?.en || ""
  }
  return label
}

const mapOptions = (code,nameObj) => {
  return {
    value: code,
    label: getNameLabel(nameObj)
   } 
}

const navCountryOptions = Object.keys(cCode).map((code) => mapOptions(code,cCode[code]))
const navLangOptions = Object.keys(navLangList).map((code) => mapOptions(code,navLangList[code]))

export default function SettingsView({onConfirmClick,initialSettingsMode}) {
  const { t, i18n } = useTranslation();
  const { size } = useBrowserData()
  const { 
    detectedCountry, 
    selectedCountry,
    activeLangListStr, 
    curCountryJsonStr, 
    langListJsonStr,
    langDataJsonStr,
    setSelectedCountry,
    setConfirmedCountry,
    updateActiveLang,
  } = useMediaPlayer()
  const curCountryLangList = (curCountryJsonStr) && JSON.parse(curCountryJsonStr)
  const langList = (langListJsonStr) && JSON.parse(langListJsonStr)
  const defaultLangList = ((curCountryLangList) && (curCountryLangList?.a)) ? Object.keys(curCountryLangList?.a) : []
  const defaultLang = (defaultLangList.length>0) ? defaultLangList[0] : "eng"
  const activeLangList = activeLangListStr ? JSON.parse(activeLangListStr) : [defaultLang]
  const curCountry = selectedCountry || detectedCountry
  const langData = (langDataJsonStr) && JSON.parse(langDataJsonStr)

  const checkTSAvailable = (l) => {
    let retVal = false
    if ((langData) && (langData[l]) && langData[l].a) {
      Object.keys(langData[l].a).forEach(id => {
        if (langData[l].a[id].ts) retVal = true
      })
    }
    return retVal
  }
  const countryLangList = (curCountryLangList) && curCountryLangList?.a
  const langListInfo = {...countryLangList}
  activeLangList && activeLangList.forEach(l => {
    langListInfo[l] = { ts: checkTSAvailable(l) }
  })
  const langKeyArr = (langList) && Object.keys(langList) || []
  const availableLangOptions = langKeyArr.map(lKey => {
    return {value: lKey,label: getNameLabel(langList[lKey])}              
  })
  let useCols = 3
  if (size==="xs") useCols = 2
  else if (size==="lg") useCols = 4
  else if (size==="xl") useCols = 5

  const handleLangClick = (l) => {
    const newList = 
      activeLangList.includes(l) 
        ? activeLangList.filter(i => i !== l)
        : [...activeLangList, l] 
    console.log(newList)
    updateActiveLang(newList)
  }
  const handleConfirmClick = () => {
    if (activeLangList.length<=0) addActiveLang(defaultLang)
    setConfirmedCountry(curCountry)
  }
  const handleCountryChange = (newCountry) => setSelectedCountry(newCountry) 
  let selLangArr = [{value: "eng", label: "English"}]
  if (langList) {
    selLangArr = activeLangList.filter(l => l && l.length>0).map(l => mapOptions(l,langList[l]))
  }
  return (
    <Box sx={{ tp: 3 }}>
      <CssBaseline />
      {initialSettingsMode && (<SimpleAppBar position="fixed">
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Bibel Wiki
          </Typography>
          <Button
            variant="contained"
            color="success"
            aria-label="confirm settings"
            onClick={handleConfirmClick}
            startIcon={<CheckIcon />}
          >Confirm Language
          </Button>
        </Toolbar>
      </SimpleAppBar>)}
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <div className="Settings-header">
          <div>Country</div>
          <Autocomplete
            id="country-autocomplete"
            disablePortal
            options={navCountryOptions}
            sx={{ 
              width: 'auto',
              backgroundColor: "lightgrey"
            }}
            renderInput={(params) => <TextField {...params} label="Country" />}
            value={mapOptions(curCountry,cCode[curCountry])}
            onChange={(event, newValue) => {
              handleCountryChange(newValue.value)
            }}
          />
          {/* <Autocomplete
            id="nav-lang-autocomplete"
            disablePortal
            options={navLangOptions}
            getOptionDisabled={(option) =>option?.value !== "eng"}
            sx={{ 
              width: '40%',
              backgroundColor: "lightgrey"
            }}
            renderInput={(params) => <TextField {...params} label="Navigation Language" />}
            value={mapOptions("eng",navLangList["eng"])}
            onChange={(event, newValue) => {
              setNavLang(newValue.value)
              // i18n.changeLanguage(newValue)
            }}
          /> */}
          <br/>
          <br/>
          <div>Selected Languages</div>
          <br/>
          <Autocomplete
            id="lang-autocomplete"
            disablePortal
            multiple
            options={availableLangOptions}
            getOptionDisabled={(option) =>option?.value === i18n.language}
            sx={{ 
              width: '100%',
              backgroundColor: "lightgrey"
            }}
            renderInput={(params) => <TextField {...params} label="Languages" />}
            value={selLangArr}
            onChange={(event, newValue) => {
              if (newValue) {
                const newList = newValue.map(item => item.value)
                updateActiveLang(newList)
              }
            }}
          />
          <br/>
          {langListInfo && (
            <ImageList
              rowHeight={120}
              cols={useCols}
              gap={9}
              sx={{overflowY: 'clip'}}
            >
              {Object.keys(langListInfo).map((lng) => {
                const langData = langList && langList[lng]
                let nativeStr = ""
                let subtitle = undefined
                if ((lng === "en") || (langData?.en === langData?.n)) {
                  nativeStr = langData?.n
                } else if (!langData?.n) {
                  nativeStr = langData?.en
                } else {
                  nativeStr = langData?.n
                  subtitle = langData?.en
                }
                let title = nativeStr
                if (lng.length>3) {
                  const countryCode = lng.slice(3,5)
                  title = `${nativeStr} (${countryCode})`
                }
                const shortNativeStr = ((curCountry === "IN") && (nativeStr)) ? nativeStr.substring(0,3) : lng
                const shortLang = capitalizeFirstLetter(shortNativeStr)
                const isActive = activeLangList.includes(lng) 
                const curData = langListInfo[lng]
                const bkgdColor = (curData?.ts) ? isActive ? 'lightgreen' :`green` : isActive ? 'lightblue' : `#020054`
                return (
                  <span key={lng}>
                    <ImageListItem onClick={() => handleLangClick(lng)}>
                      <Typography 
                        sx={{ 
                          fontSize: '30px',
                          backgroundColor: bkgdColor
                        }}>
                        {shortLang}
                      </Typography>
                      <Typography 
                        sx={{ 
                          paddingTop: '12px',
                          fontSize: '13px',
                          backgroundColor: '#444' 
                        }}>
                        {title}
                      </Typography>
                      <Typography 
                        sx={{ 
                          fontSize: '11px',
                          backgroundColor: '#444',
                          paddingBottom: '8px',
                        }}>
                        {subtitle}
                      </Typography>
                    </ImageListItem>
                  </span>
                )}
              )}
            </ImageList>
          )}
          <div 
            style={{
              paddingBottom: 30,
              // m: 1,
            }}
          >
          <br/>
        {/* <button onClick={() => window.open("https://github.com/larsgson/bibel-wiki/blob/main/roadmap.md", "_blank")}>
          Road map
        </button> */}
        </div>

        </div>
      </Box>
    </Box>
  );
}
