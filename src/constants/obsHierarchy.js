import { pad } from '../utils/obj-functions'

export const obsHierarchy = [
  {
    title: "Beginning",
    img: "000-01.png",
    beg: 1,
    count: 3
  },
  {
    title: "Patriarchs",
    img: "00-01c.png",
    beg: 4,
    count: 5
  },
  {
    title: "Exodus",
    img: "00-02d.png",
    beg: 9,
    count: 6
  },
  {
    title: "In the Promised Land",
    img: "00-03a.png",
    beg: 15,
    count: 5
  },
  {
    title: "Exile, Return and waiting on the Messiah",
    img: "000-06.png",
    beg: 20,
    count: 3
  },
  {
    title: "Jesus Starts His Ministry",
    img: "42_Lk_03_03.png",
    beg: 23,
    count: 4
  },
  {
    title: "Stories and Miracles",
    img: "42_Lk_08_01.png",
    beg: 27,
    count: 9
  },
  {
    title: "Triumph Over Death",
    img: "000-07.png",
    beg: 36,
    count: 7
  },
  {
    title: "The Church Begins",
    img: "00-08a.png",
    beg: 43,
    count: 5
  },
  {
    title: "God’s New Covenant",
    img: "66_Re_21_01.png",
    beg: 48,
    count: 3
  }
]

export const obsTitles = [
  "The Creation",
  "Sin Enters the World",
  "The Flood",
  "God’s Covenant with Abraham",
  "The Son of Promise",
  "God Provides for Isaac",
  "God Blesses Jacob",
  "God Saves Joseph and His Family",
  "God Calls Moses",
  "The Ten Plagues",
  "The Passover",
  "The Exodus",
  "God’s Covenant with Israel",
  "Wandering in the Wilderness",
  "The Promised Land",
  "The Deliverers",
  "God’s Covenant with David",
  "The Divided Kingdom",
  "The Prophets",
  "The Exile and Return",
  "God Promises the Messiah",
  "The Birth of John",
  "The Birth of Jesus",
  "John Baptizes Jesus",
  "Satan Tempts Jesus",
  "Jesus Starts His Ministry",
  "The Story of the Good Samaritan",
  "The Rich Young Ruler",
  "The Story of the Unmerciful Servant",
  "Jesus Feeds Thousands of People",
  "Jesus Walks on Water",
  "Jesus Heals a Demon-Possessed Man & a Sick Woman",
  "The Story of the Farmer",
  "Jesus Teaches Other Stories",
  "The Story of the Compassionate Father",
  "The Transfiguration",
  "Jesus Raises Lazarus from the Dead",
  "Jesus Is Betrayed",
  "Jesus Is Put on Trial",
  "Jesus Is Crucified",
  "God Raises Jesus from the Dead",
  "Jesus Returns to Heaven",
  "The Church Begins",
  "Peter and John Heal a Beggar",
  "Stephen and Philip",
  "Saul Becomes a Follower of Jesus",
  "Paul and Silas in Philippi",
  "Jesus Is the Promised Messiah",
  "God’s New Covenant",
  "Jesus Returns"
]

export const obsNbrPictures = [
  16,
  12,
  16,
  9,
  10, //5
  7,
  10,
  15,
  15,
  12, //10
  8,
  14,
  15,
  15,
  13, //15
  18,
  14,
  13,
  18,
  13, //20
  15,
  7,
  10,
  9,
  8, //25
  10,
  11,
  10,
  9,
  9, //30
  8,
  16,
  9,
  10,
  13, //35
  7,
  11,
  15,
  12,
  9, //40
  8,
  11,
  13,
  9,
  13, //45
  10,
  14,
  14,
  18,
  17 //50
]

export const obsStoryList = obsTitles.map((obj,inx) => {
  return {
    id: inx,
    title: obj,
    type: "audio",
    // descr: "",
    image: {
      "origin": "Local",
      "filename": `https://storage.googleapis.com/img.bibel.wiki/obsIcons/obs-en-${pad(inx+1)}-01.jpg`
    },
    filename: `https://bibel.wiki/audio/en_obs_${pad(inx+1)}_32kbps.mp3`
  }
})
