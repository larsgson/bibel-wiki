import * as React from 'react'
import Box from '@mui/material/Box'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import Select from '@mui/material/Select'
import useMediaPlayer from "../hooks/useMediaPlayer"

const LangSelect = () => {
  const { 
    activeLangListStr,
    selectedLanguage,
    setSelectedLanguage,
    langListJsonStr
  } = useMediaPlayer()
  const activeLangList = activeLangListStr ? JSON.parse(activeLangListStr) : [defaultLang]
  const curSelectedLang = selectedLanguage || ((activeLangList.length>0) ? activeLangList[0] : defaultLang )
  const langList = (langListJsonStr) && JSON.parse(langListJsonStr)

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
  
  const availableLangOptions = activeLangList && langList && activeLangList.map(lKey => {
    return {value: lKey,label: getNameLabel(langList[lKey])}              
  })

  const handleChange = (event) => {
    setSelectedLanguage(event.target.value)
  }

  return (
    <Box sx={{ 
        minWidth: 120,
        paddingTop: '10px'
      }}>
      <FormControl fullWidth>
        <InputLabel id="demo-simple-select-label">Language</InputLabel>
        <Select
          labelId="demo-simple-select-label"
          id="demo-simple-select"
          value={curSelectedLang}
          label="Language"
          onChange={handleChange}
        >
          {availableLangOptions && availableLangOptions.map(item => (
            <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  )
}

export default LangSelect