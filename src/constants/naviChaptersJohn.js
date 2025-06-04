import { getLocalMediaFName } from '../utils/obj-functions'

export const chInBook = 21

export const versesPerCh = [
  51,25,36,54,47,71,52,59,41,42,57,50,38,31,27,33,26,40,42,31,25
]

export const verseSumCh = [
  51,76,112,166,213,284,336,395,436,478,535,585,623,654,681,714,740,780,822,853,878
]

export const imgAlt = {
  1: ["1","16","30"],
  4: ["44","51","54"],
  5: ["4"],
  6: ["6","25","38"],
  9: ["7"],
  10: ["16","21"],
  12: ["12","13a","23","41"],
  13: ["1b"],
  14: ["27","31"],
  18: ["33","40"],
  19: ["2","17","32","33","35"],
  20: ["5","18a","20","21","24","26a","26b"],
  21: ["16c"]
}

export const imgSkip = {
  1: [2,7,13,17],
  2: [25],
  3: [7,15,20,24,31,33,35],
  4: [2,4,8,29,47],
  5: [27,29,33,38,42,47],
  6: [5,9,38,40,42,44,57,66],
  7: [4,7,11,13,24,34,49,51],
  8: [1,16,18,26,32,35,36,38,43,46,47,50,51,55,56],
  9: [4,5,19,21,23,29,31,32],
  10: [8,15,23,26,28,36],
  11: [6,10,22,48],
  12: [45],
  14: [16,19],
  18: [14,32]
}

export const getValidVerse = (ch,v) => {
  let resV = v
  if ((ch === 8) && (v === 1)) {
    console.log("increase verse")
    // This is the only exception with a larger number being returned
    resV = 2
  } else {
    while (imgSkip[ch] && imgSkip[ch].includes(resV)) resV--
  }
  return resV
}

export const imgVerseMuliple = {
  1: {5: 2, 38: 2, 39: 2, 42: 2, 43: 2, 48: 2},
  2: {6: 2, 8: 2, 11: 2, 15: 2},
  3: {4: 2},
  4: {17: 2, 25: 2, 46: 2, 50: 2, 52: 2, 53: 2},
  5: {9: 2},
  6: {10: 2, 11: 4, 17: 2, 19: 2, 21: 2},
  8: {2: 2, 6: 2, 7: 2, 9: 2, 11: 2, 12: 2, 19: 2, 25: 2},
  9: {6: 2, 11: 2, 15: 2, 16: 2, 17: 2},
  10: {18: 2, 24: 2},
  11: {20: 2, 32: 2, 34: 2, 38: 2, 39: 2, 44: 2},
  12: {2: 2, 3: 3, 9: 2, 13: 2, 19: 2, 28: 2, 35: 2, 36: 2},
  13: {1: 2, 4: 2, 5: 2, 8: 2, 10: 2, 12: 2, 27: 2, 33: 2, 36: 2},
  14: {9: 2, 10: 2, 12: 2},
  15: {4: 2, 6: 2, 15: 2, 16: 2},
  16: {7: 2, 17: 2, 19: 2, 21: 2},
  17: {24: 2},
  18: {5: 3, 7: 2, 10: 2, 13: 2, 15: 2, 16: 3, 17: 2, 18: 2, 25: 2, 27: 2, 31: 2, 37: 2, 38: 2},
  19: {6: 2, 12: 2, 15: 3, 16: 4, 19: 2, 24: 2, 26: 2, 29: 3, 30: 2, 31: 2, 34: 2, 38: 2},
  20: {2: 2, 13: 2, 15: 2, 17: 2, 18: 2, 19: 2, 25: 2, 26: 2, 27: 2, 29: 2},
  21: {3: 3, 5: 2, 6: 3, 7: 2, 8: 2, 15: 3, 16: 3, 17: 4}
}

export const imgVerseSpan = {
  1: {16: 2},
  2: {24: 2},
  3: {6: 2, 14: 2, 19: 2, 23: 2, 30: 2, 32: 2, 34: 2,},
  4: {1: 2, 3: 2, 7: 2, 28: 2, 43: 2, 46: 2, 53: 2},
  5: {26: 2, 28: 2, 32: 2, 37: 2, 41: 2, 46: 2},
  6: {4: 2, 8: 2, 37: 2, 39: 2, 41: 2, 43: 2, 56: 2, 65: 2},
  7: {3: 2, 6: 2, 10: 2, 12: 2, 23: 2, 33: 2, 48: 2, 50: 2},
  8: {15: 2, 17: 2, 25: 2, 31: 2, 34: 3, 37: 2, 42: 2, 45: 3, 49: 3, 54: 3},
  9: {3: 3, 18: 2, 20: 2, 22: 2, 28: 2, 30: 3},
  10: {7: 2, 14: 2, 22: 2, 25: 2, 27: 2, 35: 2},
  11: {5: 2, 9: 2, 21: 2, 38: 2, 47: 2},
  12: {44: 2},
  14: {15: 2, 18: 2},
  18: {13: 2, 31: 2}
}

export const imgAltVerse = {
  8: {1: "2a"},
}

export const chSelectedImgList = [
  "1v14","2v3","3v2","4v37","5v2","6v36","7v28","8v2b","9v11b",
  "10v2","11v38b-39a","12v2b","13v18","14v20","15v15a","16v25",
  "17v14","18v24","19v10","20v17b","21v15b"
]

export const johnPicsLocationUrl = "./img/john-pics"

export const getChNode = (inx,title) => {
  return (inx < chInBook)
   ? {title, image: getLocalMediaFName(johnPicsLocationUrl+"/VB-John" + chSelectedImgList[inx] + ".jpg")}
    : undefined
}

export const johnOutlineStruct = {
  1: [1,19,29,35,43],
  2: [1,13],
  3: [1,22],
  4: [1,27,39,43],
  5: [1,16,31],
  6: [1,16,25,60],
  7: [1,14,25,45],
  8: [12,21,31,48],
  9: [1,13,35],
  10: [1,22],
  11: [1,17,38,45],
  12: [1,12,20,37],
  13: [1,18,31],
  14: [1,5,15],
  15: [1,18,26],
  16: [16],
  17: [1,6,20],
  18: [1,15,19,25,28],
  19: [1,16,28,38],
  20: [1,11,19,24,30],
  21: [1,15]
}

export const johnOutlineTitle = {
  1: ["1:1-18","1:19-28","1:29-34","1:35-42","1:43-51"],
  2: ["2:1-12","2:13-25"],
  3: ["3:1-21","3:22-36"],
  4: ["4:1-26","4:27-38","4:39-42","4:43-54"],
  5: ["5:1-15","5:16-30","5:31-47"],
  6: ["6:1-15","6:16-24","6:25-59","6:60-71"],
  7: ["7:1-13","7:14-24","7:25-44","7:45-8:11"],
  8: ["8:12-20","8:21-30","8:31-47","8:48-59"],
  9: ["9:1-12","9:13-34","9:35-41"],
  10: ["10:1-21","10:22-42"],
  11: ["11:1-16","11:17-37","11:38-44","11:45-57"],
  12: ["12:1-11","12:12-19","12:20-36","12:37-50"],
  13: ["13:1-17","13:18-30","13:31-38"],
  14: ["14:1-4","14:5-14","14:15-31"],
  15: ["15:1-17","15:18-25","15:26-16:15"],
  16: ["16:16-33"],
  17: ["17:1-5","17:6-19","17:20-26"],
  18: ["18:1-14","18:15-18","18:19-24","18:25-27","18:28-40"],
  19: ["19:1-15","19:16-27","19:28-37","19:38-42"],
  20: ["20:1-10","20:11-18","20:19-23","20:24-29","20:30-31"],
  21: ["21:1-14","21:15-25"]
}

export const johnOutlineBegEndList = [
  {begin: {ch: 1, v: 1}, end: {ch: 1, v: 18}},
  {begin: {ch: 1, v: 19}, end: {ch: 1, v: 28}},
  {begin: {ch: 1, v: 29}, end: {ch: 1, v: 34}},
  {begin: {ch: 1, v: 35}, end: {ch: 1, v: 42}},
  {begin: {ch: 1, v: 43}, end: {ch: 1, v: 51}},
  {begin: {ch: 2, v: 1}, end: {ch: 2, v: 12}},
  {begin: {ch: 2, v: 13}, end: {ch: 2, v: 25}},
  {begin: {ch: 3, v: 1}, end: {ch: 3, v: 21}},
  {begin: {ch: 3, v: 22}, end: {ch: 3, v: 36}},
  {begin: {ch: 4, v: 1}, end: {ch: 4, v: 26}},
  {begin: {ch: 4, v: 27}, end: {ch: 4, v: 38}},
  {begin: {ch: 4, v: 39}, end: {ch: 4, v: 42}},
  {begin: {ch: 4, v: 43}, end: {ch: 4, v: 54}},
  {begin: {ch: 5, v: 1}, end: {ch: 5, v: 15}},
  {begin: {ch: 5, v: 16}, end: {ch: 5, v: 30}},
  {begin: {ch: 5, v: 31}, end: {ch: 5, v: 47}},
  {begin: {ch: 6, v: 1}, end: {ch: 6, v: 15}},
  {begin: {ch: 6, v: 16}, end: {ch: 6, v: 24}},
  {begin: {ch: 6, v: 25}, end: {ch: 6, v: 59}},
  {begin: {ch: 6, v: 60}, end: {ch: 6, v: 71}},
  {begin: {ch: 7, v: 1}, end: {ch: 7, v: 13}},
  {begin: {ch: 7, v: 14}, end: {ch: 7, v: 24}},
  {begin: {ch: 7, v: 25}, end: {ch: 7, v: 44}},
  {begin: {ch: 7, v: 45}, end: {ch: 8, v: 11}},
  {begin: {ch: 8, v: 12}, end: {ch: 8, v: 20}},
  {begin: {ch: 8, v: 21}, end: {ch: 8, v: 30}},
  {begin: {ch: 8, v: 31}, end: {ch: 8, v: 47}},
  {begin: {ch: 8, v: 48}, end: {ch: 8, v: 59}},
  {begin: {ch: 9, v: 1}, end: {ch: 9, v: 12}},
  {begin: {ch: 9, v: 13}, end: {ch: 9, v: 34}},
  {begin: {ch: 9, v: 35}, end: {ch: 9, v: 41}},
  {begin: {ch: 10, v: 1}, end: {ch: 10, v: 21}},
  {begin: {ch: 10, v: 22}, end: {ch: 10, v: 42}},
  {begin: {ch: 11, v: 1}, end: {ch: 11, v: 16}},
  {begin: {ch: 11, v: 17}, end: {ch: 11, v: 37}},
  {begin: {ch: 11, v: 38}, end: {ch: 11, v: 44}},
  {begin: {ch: 11, v: 45}, end: {ch: 11, v: 57}},
  {begin: {ch: 12, v: 1}, end: {ch: 12, v: 11}},
  {begin: {ch: 12, v: 12}, end: {ch: 12, v: 19}},
  {begin: {ch: 12, v: 20}, end: {ch: 12, v: 36}},
  {begin: {ch: 12, v: 37}, end: {ch: 12, v: 50}},
  {begin: {ch: 13, v: 1}, end: {ch: 13, v: 17}},
  {begin: {ch: 13, v: 18}, end: {ch: 13, v: 30}},
  {begin: {ch: 13, v: 31}, end: {ch: 13, v: 38}},
  {begin: {ch: 14, v: 1}, end: {ch: 14, v: 4}},
  {begin: {ch: 14, v: 5}, end: {ch: 14, v: 14}},
  {begin: {ch: 14, v: 15}, end: {ch: 14, v: 31}},
  {begin: {ch: 15, v: 1}, end: {ch: 15, v: 17}},
  {begin: {ch: 15, v: 18}, end: {ch: 15, v: 25}},
  {begin: {ch: 15, v: 26}, end: {ch: 16, v: 15}},
  {begin: {ch: 16, v: 16}, end: {ch: 16, v: 33}},
  {begin: {ch: 17, v: 1}, end: {ch: 17, v: 5}},
  {begin: {ch: 17, v: 6}, end: {ch: 17, v: 19}},
  {begin: {ch: 17, v: 20}, end: {ch: 17, v: 26}},
  {begin: { ch: 18, v: 1 }, end: { ch: 18, v: 11 },},
  {
    treeNode: [
      {
        begin: { ch: 18, v: 12 },
        end: { ch: 18, v: 14 },
      },
      {
        begin: { ch: 18, v: 19 },
        end: { ch: 18, v: 24 },
      },    
    ],
  },
  {
    treeNode: [
      {
        begin: { ch: 18, v: 15 },
        end: { ch: 18, v: 18 },
      },
      {
        begin: { ch: 18, v: 25 },
        end: { ch: 18, v: 27 },
      }
    ],
  },
  {begin: { ch: 18, v: 28 }, end: { ch: 18, v: 37 },},
  {begin: {ch: 18, v: 38}, end: {ch: 18, v: 40}},
  {begin: {ch: 19, v: 1}, end: {ch: 19, v: 15}},
  {begin: {ch: 19, v: 16}, end: {ch: 19, v: 27}},
  {begin: {ch: 19, v: 28}, end: {ch: 19, v: 37}},
  {begin: {ch: 19, v: 38}, end: {ch: 19, v: 42}},
  {begin: {ch: 20, v: 1}, end: {ch: 20, v: 10}},
  {begin: {ch: 20, v: 11}, end: {ch: 20, v: 18}},
  {begin: {ch: 20, v: 19}, end: {ch: 20, v: 23}},
  {begin: {ch: 20, v: 24}, end: {ch: 20, v: 29}},
  {begin: {ch: 20, v: 30}, end: {ch: 20, v: 31}},
  {begin: {ch: 21, v: 1}, end: {ch: 21, v: 14}},
  {begin: {ch: 21, v: 15}, end: {ch: 21, v: 25}}
]

// export const johnOutlineTitleList = johnOutlineBegEndList.map((obj) => {
//   const b=obj.begin
//   const e=obj.end
//   return (b.ch===e.ch) ? `${b.ch}:${b.v}-${e.v}` : `${b.ch}:${b.v}-${e.ch}:${e.v}`
// })

// export const getOutlineOptions = (t) => {
//   const vDelim = t("ChVerseDelimiter")
//   const chList = [...Array(chInBook).keys()].map((val,inx) => {
//     const ch = inx+1
//     const tKey = `John.${ch}`
//     return {
//       key: `${ch}`,
//       begin: {ch, v: 1},
//       end: {ch, v: versesPerCh[inx]},
//       label: t("Chapter")+` ${ch} - ${t(tKey)}`
//     }
//   })
//   const outlineList = johnOutlineBegEndList.map((obj) => {
//     const key = obj.begin.ch+vDelim+obj.begin.v
//     const tKey = "John."+obj.begin.ch+"."+obj.begin.v
//     const label = key+" "+t(tKey)
//     return { ...obj, key, label }
//   })
//   return [...outlineList, ...chList]
// }

export const johnImageID = {
  1: johnPicsLocationUrl+"/VB-John1v14.jpg",
  2: johnPicsLocationUrl+"/VB-John2v3.jpg",
  3: johnPicsLocationUrl+"/VB-John3v2.jpg",
  4: johnPicsLocationUrl+"/VB-John4v37.jpg",
  5: johnPicsLocationUrl+"/VB-John5v2.jpg",
  6: johnPicsLocationUrl+"/VB-John6v36.jpg",
  7: johnPicsLocationUrl+"/VB-John7v28.jpg",
  8: johnPicsLocationUrl+"/VB-John8v2b.jpg",
  9: johnPicsLocationUrl+"/VB-John9v11b.jpg",
  10: johnPicsLocationUrl+"/VB-John10v2.jpg",
  11: johnPicsLocationUrl+"/VB-John11v38b-39a.jpg",
  12: johnPicsLocationUrl+"/VB-John12v2b.jpg",
  13: johnPicsLocationUrl+"/VB-John13v18.jpg",
  14: johnPicsLocationUrl+"/VB-John14v20.jpg",
  15: johnPicsLocationUrl+"/VB-John15v15a.jpg",
  16: johnPicsLocationUrl+"/VB-John16v25.jpg",
  17: johnPicsLocationUrl+"/VB-John17v14.jpg",
  18: johnPicsLocationUrl+"/VB-John18v24.jpg",
  19: johnPicsLocationUrl+"/VB-John19v10.jpg",
  20: johnPicsLocationUrl+"/VB-John20v17b.jpg",
  21: johnPicsLocationUrl+"/VB-John21v15b.jpg"
}

export const outlinesOfJohnObj = (entry) => {
  return {
    episodeList: [{
      id: entry.label,
      title: entry.label,
      descr: "",
      image: {
        origin: "ImgId",
        filename: johnImageID[entry.begin.ch]
      }
    }],
    title: "John -",
    description: "",
    image: {
      origin: "ImgId",
      filename: johnPicsLocationUrl+"/VB-John1v3.jpg"
    },
    language: "en",
    mediaType: "vid"
  }
}

export const getImgSrcString = (ch,v) => {
  let imgVStr = v
  if ((imgSkip[ch]) && (imgSkip[ch].includes(v))) {
    return undefined
  } else if ((imgVerseMuliple[ch]) && (imgVerseMuliple[ch][v])) {
    imgVStr = v+"a"
  } else if ((imgVerseSpan[ch]) && (imgVerseSpan[ch][v])) {
    const addInx = imgVerseSpan[ch][v] -1
    imgVStr = `${v}-${v+addInx}`
  } else if ((imgAltVerse[ch]) && (imgAltVerse[ch][v])) {
    imgVStr = imgAltVerse[ch][v]
  }
  return `./img/john-pics/VB-John${ch}v${imgVStr}.jpg`
}

export const gospelOfJohnPlanObj = {
  episodeList: johnOutlineBegEndList.map((obj,inx) => {
    if (!obj.treeNode) {
      const begin = obj.begin
      const end = obj.end
      const ch = obj.begin.ch
      const v = obj.begin.v
      const filename = getImgSrcString(ch,v) || getImgSrcString(ch,getValidVerse(ch,v))
      return {
        id: inx,
        title: `John.${ch}.${v}`,
        descr: `John.${ch}.${v}.descr`,
        begin,
        end,
        image: {
          origin: "Local",
          filename
        }
      }  
    } else { // ToDo: Implement using all treeNode objects, not just the first one !!!
      const useObj0 = obj.treeNode[0]
      const begin = useObj0.begin
      const end = useObj0.end
      const ch = useObj0.begin.ch
      const v = useObj0.begin.v
      const filename = getImgSrcString(ch,v) || getImgSrcString(ch,getValidVerse(ch,v))
      return {
        id: inx,
        title: `John.${ch}.${v}`,
        descr: `John.${ch}.${v}.descr`,
        begin,
        end,
        image: {
          origin: "Local",
          filename
        }
      }        
    }
  }),
  title: "John",
  description: "John.Descr",
  uniqueID: "Jesus.net.John.serie",
  beginDate: "2025-06-01",
  listYtbURL: {
    en: "https://www.youtube.com/watch?v=xEK-0n88zSI",
    de: "https://www.youtube.com/watch?v=MpGiPo8UuVk",
    por: "https://www.youtube.com/watch?v=dR3NP2tnWl4",
    es: "https://www.youtube.com/watch?v=yGEPSKZJmCA"
  },  
  image: {
    origin: "ImgId",
    filename: "https://storage.googleapis.com/img.bibel.wiki/img/john-pics/VB-John1v3.jpg"
  },
  language: "en",
  mediaType: "vid",
  fb: true
}

export const gospelOfJohnObj = {
  episodeList: [...Array(chInBook).keys()].map((val,inx) => ({
    id: inx,
    title: `John.${inx+1}`,
    descr: `John.${inx+1}.Descr`,
    image: {
      origin: "ImgId",
      filename: johnImageID[inx+1]
    }
  })),
  title: "John",
  description: "John.Descr",
  uniqueID: "Jesus.net.John.serie",
  image: {
    origin: "ImgId",
    filename: johnPicsLocationUrl+"/VB-John1v3.jpg"
  },
  listYtbURL: {
    en: "https://www.youtube.com/watch?v=xEK-0n88zSI",
    de: "https://www.youtube.com/watch?v=MpGiPo8UuVk",
    por: "https://www.youtube.com/watch?v=dR3NP2tnWl4",
    es: "https://www.youtube.com/watch?v=yGEPSKZJmCA",
    fr: "https://www.youtube.com/watch?v=_OresYj3J2Q"
  },  
  language: "en",
  langID: "en",
  mediaType: "vid"
}
