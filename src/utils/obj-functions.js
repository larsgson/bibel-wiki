import { osisIconId, osisIconList } from '../constants/osisIconList'

export const isEmpty = obj => ((obj==null) || (Object.getOwnPropertyNames(obj).length === 0))
export const isEmptyObj = obj => ((isEmpty(obj)) || (Object.keys(obj).length === 0))
export const rangeArray = (beg, end) => Array.from(Array(end+1-beg),(val,index)=>index+beg)
export const arrayRemove = (array, element) => array.filter(el => el !== element)
export const arrayInsert = (array, i, ...rest) => array.slice(0,i).concat(rest,array.slice(i))

export const arrayToObject = (array, keyField) =>
  array.reduce((obj, item) => {
    obj[item[keyField]] = item
    return obj
  }, {})

export const getLocFilePrefix = () => {
  let retStr = ""
  return retStr
}

export const jsonCopy = (obj) => JSON.parse(JSON.stringify(obj))
export const pad = (n) => ((n < 10) && (n >=0)) ? (`0${  n}`) : n
export const removeAllDigits = str => str.replace(/\d/g, "")
export const keepAllDigits = str => str.replace(/\D/g, "")
export const uniqueArray = array => [ ...new Set(array)]
export const nbrOfKeysInObj = obj => ((obj==null) ? 0 : Object.getOwnPropertyNames(obj).length )
export const jsonEqual = (a,b) => JSON.stringify(a) === JSON.stringify(b)

export const nullToEmptyStr = str => (str==null) ? "": str

export const removeEqualEndOfStr = (a, b) => {
  let resStr = ""
  let diffFound = false
  for (let i = a.length-1; i >= 0; i--) {
    if (diffFound || (a[i]!==b[i])){
      diffFound = true
      resStr = a[i] + resStr
    }
  }
  return resStr
}

export const getLocalImgFName = (remoteUrl, key) => {
  const checkURL = url.parse(remoteUrl)
//  return "x/" + checkURL.host + checkURL.pathname + "-" + key + ".jpg"
  return "x/" + checkURL.host + checkURL.pathname + "-" + key + ".jpg"
}

export const getImgOfType = (type) => {
  let retStr = "/icon/clapperboard.png"
  if (type==="aud"){
    retStr = "/icon/headphones.png"
  } else if (type==="epub"){
    retStr = "/icon/book.png"
  } else if (type==="html"){
    retStr = "/icon/education.png"
  }
  return retStr
}

export const getImgOfObj = (ser,t) => {
  let retStr = "img/Placeholder.png"
  if (ser!=null){
    if(ser.image!=null){
      if((ser.image.origin==="Unsplash")
        &&(ser.image.urls!=null)
        &&(ser.image.urls.raw!=null)){
        retStr = getLocalImgFName(ser.image.urls.raw,"small")
      } else if ((ser.image.origin==="YT")||((ser.image.origin==="icon"))){
        const checkFile = (ser.episodeList!=null) ? ser.episodeList[0].filename : ser.filename
        let image = ""
        const checkRegEx = /^.*https:\/\/.*youtube.com\/watch\?v=(.*)$/
        const matches = checkFile.match(checkRegEx)
        if ((matches!=null)&&(matches.length>0)) {
          image = "https://img.youtube.com/vi/" + matches[1] + "/mqdefault.jpg"
        }
        retStr = image
      } else if((ser.image.origin==="Local")
        &&(ser.image.filename!=null)){
        retStr = ser.image.filename
      } else if((ser.image.origin==="Url")
        &&(ser.image.filename!=null)){
        retStr = ser.image.filename
      } else if((ser.image.origin==="ImgId")
        &&(ser.image.filename!=null)){
        retStr = ser.image.filename
      }
    } else if (ser.index!=null){
      retStr = "img/ser" + pad((ser.index) % 41) + ".jpg"
    }
  }
  return retStr
}

export const getChFreePicFirstEntry = (bookObj,ch) => {
  const preNav = "https://storage.googleapis.com/img.bibel.wiki/navIcons/"
  const picsPreNav = "https://storage.googleapis.com/img.bibel.wiki/img/free-pics/"
  const {level1,level2} = bookObj
  let checkIcon = "000-" + pad(level1)
  if (level2!=null) checkIcon = "00-" + pad(level1) + level2
  let imgSrc
  let useDefaultImage = true
  // Book Icon - To Do - to be added in the future
  // imgSrc = preBook +getOsisIcon(bk) +".png"
  // Replace this above with book icons !
  const bk = (bookObj!=null)?bookObj.bk:null
  if (bk!=null){ // level 3
    const checkObj = osisIconList[bk]
    if (checkObj!=null){
      let useCh
      if (ch==null){
        const entry = Object.entries(checkObj)[0]
        useCh = entry[0]
        if (bk!=null){ // level 3
          const {beg,end} = bookObj
          if ((beg!=null)&&(end!=null)){
            useCh = Object.keys(checkObj).find(key => key>=beg)
          }
        }
      } else {
        if (checkObj[ch]!=null) useCh = ch
      }
      if (useCh!=null){
        const prefixIdStr = osisIconId[bk]
        const firstId = pad(parseInt(useCh))
        const firstEntry = checkObj[useCh][0].slice(0,2) // only accept first two numbers - ignore any trailing letter
        checkIcon = `${prefixIdStr.slice(0,2)}/610px/${osisIconId[bk]}_${firstId}_${firstEntry}_RG`
        useDefaultImage = false
      }
    }
  }
  imgSrc = useDefaultImage ? preNav +checkIcon +".png" : picsPreNav +checkIcon +".jpg"
  return {
    imgSrc,
    ch,
  }
}

export const getChFreePic = (bookObj,ch,verseStr) => {
  const preNav = "https://storage.googleapis.com/img.bibel.wiki/navIcons/"
  const picsPreNav = "https://storage.googleapis.com/img.bibel.wiki/img/free-pics/"
  const {level1,level2} = bookObj
  let checkIcon = "000-" + pad(level1)
  if (level2!=null) checkIcon = "00-" + pad(level1) + level2
  let useDefaultImage = true
  // Book Icon - To Do - to be added in the future
  // imgSrc = preBook +getOsisIcon(bk) +".png"
  // Replace this above with book icons !
  const bk = (bookObj!=null)?bookObj.bk:null
  if (bk!=null){ // level 3
    const checkObj = osisIconList[bk]
    if (checkObj!=null){
      if (checkObj[ch]!=null){
        const prefixIdStr = osisIconId[bk]
        const firstId = pad(parseInt(ch))
        checkIcon = `${prefixIdStr.slice(0,2)}/610px/${osisIconId[bk]}_${verseStr}_RG`
        useDefaultImage = false
      }
    }
  }
  return useDefaultImage ? preNav +checkIcon +".png" : picsPreNav +checkIcon +".jpg"
}

export const getLocalMediaFName = (url) => encodeURI("/" + url)

export const dateToString = (date) => `${date.getFullYear()}-${pad(date.getMonth())}-${pad(date.getDate())}`

export const treatAsUTC = (date) => {
  var result = new Date(date);
  result.setMinutes(result.getMinutes() - result.getTimezoneOffset());
  return result;
}

export const daysBetween = (startDate, endDate) => {
  var millisecondsPerDay = 24 * 60 * 60 * 1000;
  return (treatAsUTC(endDate) - treatAsUTC(startDate)) / millisecondsPerDay;
}

/* Example mapped function on object
const oMap = (o, f) => Object.assign(...Object.keys(o).map(k => ({ [k]: f(o[k]) })))
// For instance - square of each value:
let mappedObj = oMap(myObj, (x) => x * x)
*/
