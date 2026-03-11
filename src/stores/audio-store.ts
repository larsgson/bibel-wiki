import { atom, computed } from "nanostores"

// ---- Types ----

export interface VerseEntry {
  verseStart: number
  verseEnd: number
  startTime: number
  endTime: number
  audioUrl?: string | null
  /** Visual section index — multiple entries can share the same sectionIndex */
  sectionIndex?: number
}

export type AudioPlayState = "idle" | "playing_primary" | "playing_secondary"

/** Information about what chapter the audio is playing */
export interface AudioContext {
  distinctId: string
  bookCode: string
  chapter: number
  bookName: string
}

export interface PausedState {
  verseIdx: number
  wasSecondary: boolean
}

// ---- Atoms ----

export const $audioPlayState = atom<AudioPlayState>("idle")
export const $audioContext = atom<AudioContext | null>(null)
export const $currentVerseIdx = atom<number>(0)
export const $currentVerseEntries = atom<VerseEntry[]>([])
export const $secondaryVerseEntries = atom<VerseEntry[]>([])
export const $cachedAudioUrl = atom<string | null>(null)
export const $cachedSecondaryAudioUrl = atom<string | null>(null)
export const $pausedState = atom<PausedState | null>(null)
export const $audioUnlocked = atom<boolean>(false)
export const $playerVisible = atom<boolean>(false)
export const $playerCardInfo = atom<{ title: string; imageUrl: string | null }>({
  title: "\u2014",
  imageUrl: null,
})
export const $focusMode = atom<boolean>(false)
/** Identifies the story that audio is playing for */
export const $audioPageStory = atom<string>("")

// ---- Derived stores ----

export const $isPlaying = computed($audioPlayState, (s) => s !== "idle")

// ---- Audio element singletons ----

let primaryAudio: HTMLAudioElement | null = null
let secondaryAudio: HTMLAudioElement | null = null
let primaryAudioSrc = ""
let secondaryAudioSrc = ""

export function getAudioElements() {
  if (!primaryAudio) {
    primaryAudio = new Audio()
    secondaryAudio = new Audio()
    primaryAudio.addEventListener("error", () => {
      console.warn("Audio error (primary):", primaryAudio?.error?.message || "unknown")
      if ($audioPlayState.get() !== "idle") stopAll()
    })
    secondaryAudio!.addEventListener("error", () => {
      console.warn("Audio error (secondary):", secondaryAudio?.error?.message || "unknown")
      if ($audioPlayState.get() !== "idle") stopAll()
    })
    primaryAudio.addEventListener("timeupdate", onPrimaryTimeUpdate)
    secondaryAudio!.addEventListener("timeupdate", onSecondaryTimeUpdate)
  }
  return { primaryAudio: primaryAudio!, secondaryAudio: secondaryAudio! }
}

// ---- Callbacks for page-level integration ----

interface AudioCallbacks {
  findBestImage: (chapter: number, verse: number) => string | null
  imgProxy: (url: string, w: number) => string
}

let callbacks: AudioCallbacks | null = null

export function registerAudioCallbacks(cb: AudioCallbacks) {
  callbacks = cb
}

// ---- Internal helpers ----

function seekAndPlay(
  audioEl: HTMLAudioElement,
  currentSrc: string,
  url: string,
  startTime: number,
  setSrc: (s: string) => void,
) {
  if (currentSrc === url) {
    audioEl.currentTime = startTime
    audioEl.play().catch(() => {})
  } else {
    setSrc(url)
    audioEl.src = url
    audioEl.addEventListener("canplay", function onCanPlay() {
      audioEl.removeEventListener("canplay", onCanPlay)
      audioEl.currentTime = startTime
      audioEl.play().catch(() => {})
    })
  }
}

function updatePlayerCardInfo(idx: number) {
  const entries = $currentVerseEntries.get()
  const ctx = $audioContext.get()
  if (!ctx || !entries[idx]) return

  const entry = entries[idx]
  const verseDisplay =
    entry.verseStart === entry.verseEnd
      ? String(entry.verseStart)
      : `${entry.verseStart}-${entry.verseEnd}`

  const title = `${ctx.bookName} ${ctx.chapter}:${verseDisplay}`

  let imageUrl: string | null = null
  if (callbacks?.findBestImage) {
    const raw = callbacks.findBestImage(ctx.chapter, entry.verseStart)
    if (raw && callbacks.imgProxy) {
      imageUrl = callbacks.imgProxy(raw, 560)
    }
  }

  $playerCardInfo.set({ title, imageUrl })
}

// ---- Timeupdate handlers (boundary detection) ----

function onPrimaryTimeUpdate() {
  if ($audioPlayState.get() !== "playing_primary") return
  const entries = $currentVerseEntries.get()
  if (!entries.length || !primaryAudio) return

  const currentTime = primaryAudio.currentTime
  const idx = $currentVerseIdx.get()

  // Find the audio URL for the currently playing entry
  const playingUrl = entries[idx]?.audioUrl || $cachedAudioUrl.get()

  // Find the CONSECUTIVE run of entries sharing the same audio URL, starting from idx.
  // Walk forward from idx while the audio URL matches.
  let groupEnd = idx
  for (let i = idx + 1; i < entries.length; i++) {
    const entryUrl = entries[i].audioUrl || $cachedAudioUrl.get()
    if (entryUrl !== playingUrl) break
    groupEnd = i
  }

  // Find the last entry in this consecutive group that has actual timing
  let lastTimed: typeof entries[0] | null = null
  let lastTimedIdx = -1
  for (let i = groupEnd; i >= idx; i--) {
    if (entries[i].endTime > entries[i].startTime) {
      lastTimed = entries[i]
      lastTimedIdx = i
      break
    }
  }

  // At end of last timed verse in this consecutive group, advance to next entry
  if (lastTimed && currentTime >= lastTimed.endTime) {
    // Find next entry that has actual timing data (skip no-timing entries)
    let nextIdx = -1
    for (let i = groupEnd + 1; i < entries.length; i++) {
      if (entries[i].endTime > entries[i].startTime) {
        nextIdx = i
        break
      }
    }
    if (nextIdx >= 0) {
      playVerse(nextIdx)
    } else {
      stopAll()
    }
    return
  }

  // Find which entry we're currently in by matching time — only within the consecutive group
  for (let i = groupEnd; i >= idx; i--) {
    const e = entries[i]
    if (e.startTime > 0 && currentTime >= e.startTime) {
      if (i !== idx) {
        $currentVerseIdx.set(i)
        updatePlayerCardInfo(i)
      }
      break
    }
  }
}

function onSecondaryTimeUpdate() {
  if ($audioPlayState.get() !== "playing_secondary") return
  const entries = $secondaryVerseEntries.get()
  const idx = $currentVerseIdx.get()
  const entry = entries[idx]
  if (!entry || !secondaryAudio) return
  if (entry.endTime > entry.startTime && secondaryAudio.currentTime >= entry.endTime) {
    secondaryAudio.pause()
    advanceToNextVerse()
  }
}

// ---- Public actions ----

export function playVerse(idx: number) {
  const entries = $currentVerseEntries.get()
  const entry = entries[idx]
  const audioUrl = entry?.audioUrl || $cachedAudioUrl.get()
  if (idx >= entries.length || !audioUrl) {
    stopAll()
    return
  }

  const { primaryAudio: pa } = getAudioElements()

  $currentVerseIdx.set(idx)
  $audioPlayState.set("playing_primary")
  $pausedState.set(null)
  $playerVisible.set(true)

  updatePlayerCardInfo(idx)

  seekAndPlay(pa, primaryAudioSrc, audioUrl, entry.startTime, (s) => {
    primaryAudioSrc = s
  })
}

export function playSecondaryForVerse(idx: number) {
  const secondaryUrl = $cachedSecondaryAudioUrl.get()
  const entries = $secondaryVerseEntries.get()
  if (!secondaryUrl || idx >= entries.length) {
    advanceToNextVerse()
    return
  }
  const { secondaryAudio: sa } = getAudioElements()
  const entry = entries[idx]
  $audioPlayState.set("playing_secondary")
  seekAndPlay(sa, secondaryAudioSrc, secondaryUrl, entry.startTime, (s) => {
    secondaryAudioSrc = s
  })
}

export function advanceToNextVerse() {
  const entries = $currentVerseEntries.get()
  // Find next section that has actual timing data (skip no-timing entries)
  let nextIdx = -1
  for (let i = $currentVerseIdx.get() + 1; i < entries.length; i++) {
    if (entries[i].endTime > entries[i].startTime) {
      nextIdx = i
      break
    }
  }
  if (nextIdx < 0) {
    stopAll()
    return
  }
  playVerse(nextIdx)
  // scrollToVerse is handled by the page subscriber
}

export function stopAll() {
  const els = getAudioElements()
  els.primaryAudio.pause()
  els.secondaryAudio.pause()
  $audioPlayState.set("idle")
  $pausedState.set(null)
  $focusMode.set(false)
  $playerVisible.set(false)
}

export function pausePlayback() {
  const wasSecondary = $audioPlayState.get() === "playing_secondary"
  $pausedState.set({ verseIdx: $currentVerseIdx.get(), wasSecondary })
  const els = getAudioElements()
  els.primaryAudio.pause()
  els.secondaryAudio.pause()
  $audioPlayState.set("idle")
  // playerVisible stays true when paused
}

export function resumePlayback() {
  const paused = $pausedState.get()
  if (!paused) return
  const els = getAudioElements()
  $currentVerseIdx.set(paused.verseIdx)
  if (paused.wasSecondary && $cachedSecondaryAudioUrl.get()) {
    $audioPlayState.set("playing_secondary")
    els.secondaryAudio.play().catch(() => {})
  } else {
    $audioPlayState.set("playing_primary")
    els.primaryAudio.play().catch(() => {})
  }
  $pausedState.set(null)
}

/**
 * Prepare audio context for a new chapter.
 * Called by the page script when entering a verses view.
 * Returns true if same chapter was already playing (state preserved).
 */
export function setAudioForChapter(params: {
  distinctId: string
  bookCode: string
  chapter: number
  bookName: string
  audioUrl: string | null
  verseEntries: VerseEntry[]
  secondaryAudioUrl?: string | null
  secondaryVerseEntries?: VerseEntry[]
}): boolean {
  const currentCtx = $audioContext.get()
  const isSameChapter =
    currentCtx &&
    currentCtx.distinctId === params.distinctId &&
    currentCtx.bookCode === params.bookCode &&
    currentCtx.chapter === params.chapter

  // If audio is playing for a different chapter, stop audio but preserve focus mode
  if (!isSameChapter && $audioPlayState.get() !== "idle") {
    const els = getAudioElements()
    els.primaryAudio.pause()
    els.secondaryAudio.pause()
    $audioPlayState.set("idle")
    $pausedState.set(null)
    $playerVisible.set(false)
  }

  $audioContext.set({
    distinctId: params.distinctId,
    bookCode: params.bookCode,
    chapter: params.chapter,
    bookName: params.bookName,
  })
  $cachedAudioUrl.set(params.audioUrl)
  $currentVerseEntries.set(params.verseEntries)
  $cachedSecondaryAudioUrl.set(params.secondaryAudioUrl ?? null)
  $secondaryVerseEntries.set(params.secondaryVerseEntries ?? [])

  // If returning to the same chapter that was playing/paused, preserve state
  if (isSameChapter && ($audioPlayState.get() !== "idle" || $pausedState.get())) {
    return true
  }

  return false
}

// ---- iOS audio unlock ----

const SILENT_WAV = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA="

export function unlockAudio() {
  if ($audioUnlocked.get()) return
  $audioUnlocked.set(true)
  const silent = new Audio(SILENT_WAV)
  silent
    .play()
    .then(() => silent.remove())
    .catch(() => {})
}
