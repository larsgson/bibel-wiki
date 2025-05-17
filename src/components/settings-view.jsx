import {useEffect, useState} from 'react';
import { useTranslation } from 'react-i18next'
// import { navLangList } from '../constants/languages'
import ImageList from '@mui/material/ImageList'
import ImageListItem from '@mui/material/ImageListItem'
import ImageListItemBar from '@mui/material/ImageListItemBar'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
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

export default function SettingsView() {
  const { t, i18n } = useTranslation();
  const { size } = useBrowserData()
  const [navLang,setNavLang] = useState("eng")
  const { 
    detectedCountry, 
    selectedCountry,
    selectedLang, 
    curCountryJsonStr, 
    langListJsonStr,
    setSelectedCountry,
    setSelectedLang,
  } = useMediaPlayer()
  const curCountry = selectedCountry || detectedCountry
  const curCountryLangList = (curCountryJsonStr) && JSON.parse(curCountryJsonStr)
  const langList = (langListJsonStr) && JSON.parse(langListJsonStr)
  const curCountryLangData = {}
  const curSelectedLang = selectedLang || "eng"

  const typeKeyArr = (curCountryLangList) && Object.keys(curCountryLangList)
  if (typeKeyArr?.length>0) {
    typeKeyArr.forEach(typeKey => {
      const langKeyArr = (curCountryLangList[typeKey]) && Object.keys(curCountryLangList[typeKey])
      if (langKeyArr?.length>0) {
        langKeyArr.forEach(langKey => {
          curCountryLangData[langKey] = getNameLabel(langList[langKey])
        })
      }
    })
  }
  const langKeyArr = (langList) && Object.keys(langList) || []
  const availableLangOptions = langKeyArr.map(lKey => {
    return {value: lKey,label: getNameLabel(langList[lKey])}              
  })
  let useCols = 3
  if (size==="xs") useCols = 2
  else if (size==="lg") useCols = 4
  else if (size==="xl") useCols = 5
  const handleLangClick = (l) => {
    console.log(l)
    // i18n.changeLanguage(l) 
    setSelectedLang(l)
  }
  return (
    <div className="App">
      <header className="App-header">
        <div>Country</div>
        <Autocomplete
          id="country-autocomplete"
          disablePortal
          options={navCountryOptions}
          sx={{ 
            width: '100%',
            backgroundColor: "lightgrey"
          }}
          renderInput={(params) => <TextField {...params} label="Country" />}
          value={mapOptions(curCountry,cCode[curCountry])}
          onChange={(event, newValue) => {
            setSelectedCountry(newValue.value)
          }}
        />
        <br/>
        <br/>
        <div>Navigation Language</div>
        <Autocomplete
          id="nav-lang-autocomplete"
          disablePortal
          options={navLangOptions}
          getOptionDisabled={(option) =>option?.value !== "eng"}
          sx={{ 
            width: '100%',
            backgroundColor: "lightgrey"
          }}
          renderInput={(params) => <TextField {...params} label="Language" />}
          value={mapOptions("eng",navLangList["eng"])}
          onChange={(event, newValue) => {
            setNavLang(newValue.value)
            // i18n.changeLanguage(newValue)
          }}
        />
        <br/>
        <br/>
        <div>Available Languages</div>
        <br/>
        <Autocomplete
          id="lang-autocomplete"
          disablePortal
          options={availableLangOptions}
          getOptionDisabled={(option) =>option?.value === i18n.language}
          sx={{ 
            width: '100%',
            backgroundColor: "lightgrey"
          }}
          renderInput={(params) => <TextField {...params} label="Language" />}
          value={(langList) ? mapOptions(curSelectedLang,langList[curSelectedLang]) : {value: "eng", label: "English"}}
          onChange={(event, newValue) => {
            if (newValue) {
              handleLangClick(newValue.value)
            }
          }}
        />
        <br/>
        {curCountryLangList && curCountryLangList?.a && (
          <ImageList
            rowHeight={120}
            cols={useCols}
            gap={9}
            sx={{overflowY: 'clip'}}
          >
            {Object.keys(curCountryLangList?.a).map((lng) => {
              const langData = langList[lng]
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
              const shortNativeStr = ((selectedCountry === "IN") && (nativeStr)) ? nativeStr.substring(0,3) : lng
              const shortLang = capitalizeFirstLetter(shortNativeStr)
              // const isSelected = i18n.language === lng
              const key = lng
              const curData = curCountryLangList?.a[lng]
              const bkgdColor = (curData?.ts) ? `green` : `#020054`
              return (
                <span key={key}>
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

      </header>
    </div>
  );
}
