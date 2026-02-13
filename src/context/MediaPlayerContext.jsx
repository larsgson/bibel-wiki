import React, {
  createContext,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { Howl } from "howler";

const MediaPlayerContext = createContext(null);

export const MediaPlayerProvider = ({ children }) => {
  const [state, setState] = useState({
    currentPlaylist: null,
    queue: [],
    isPlaying: false,
    isPaused: false,
    currentSegmentIndex: 0,
    currentTime: 0,
    duration: 0,
    virtualTime: 0,
    totalDuration: 0,
    isLoading: false,
    error: null,
    playbackRate: 1.0,
    isMinimized: false,
    audioLanguage: null, // Language for audio playback (independent of display language)
    currentStoryId: null, // Track which story is currently loaded/playing
    currentStoryData: null, // Full story data for navigation back to playing story
  });

  const howlRef = useRef(null);
  const nextHowlRef = useRef(null); // For prefetching next segment
  const currentSegmentRef = useRef(null);
  const isSeekingRef = useRef(false);
  const playlistRef = useRef(null);
  const queueRef = useRef([]);
  const segmentMapRef = useRef([]); // Enhanced playlist with virtual timeline
  const virtualTimeRef = useRef(0);
  const isPlayingRef = useRef(false);
  const timeUpdateIntervalRef = useRef(null);
  const playlistIdRef = useRef(0); // Unique ID to track playlist loads
  const isLoadingPlaylistRef = useRef(false); // Prevent concurrent playlist loads

  // Build segment map with virtual timeline
  const buildSegmentMap = useCallback((playlist) => {
    if (!playlist || !playlist.length) return [];

    let cumulativeTime = 0;
    const segmentMap = playlist.map((segment, index) => {
      const timingData = segment.timingData;
      const timestamps = timingData?.timestamps || [];

      // Calculate segment duration from timestamps
      let segmentDuration = 0;
      if (timestamps.length >= 2) {
        segmentDuration = timestamps[timestamps.length - 1] - timestamps[0];
      }

      const startTimestamp = timestamps[0] || 0;
      const endTimestamp = timestamps[timestamps.length - 1] || startTimestamp;

      const enhancedSegment = {
        ...segment,
        index,
        startTimestamp,
        endTimestamp,
        duration: segmentDuration,
        virtualStart: cumulativeTime,
        virtualEnd: cumulativeTime + segmentDuration,
      };

      cumulativeTime += segmentDuration;
      return enhancedSegment;
    });

    return segmentMap;
  }, []);

  // Calculate virtual time from real audio position
  const calculateVirtualTime = useCallback(() => {
    const segmentMap = segmentMapRef.current;
    const currentIndex = currentSegmentRef.current;
    const howl = howlRef.current;

    if (!segmentMap.length || !howl || currentIndex >= segmentMap.length) {
      return 0;
    }

    const currentSegment = segmentMap[currentIndex];
    const realTime = howl.seek();
    const offset = realTime - currentSegment.startTimestamp;
    const virtualTime = currentSegment.virtualStart + offset;

    return Math.max(0, virtualTime);
  }, []);

  // Prefetch next segment audio
  const prefetchNextSegment = useCallback(() => {
    const segmentMap = segmentMapRef.current;
    const currentIndex = currentSegmentRef.current;

    if (!segmentMap.length) return;

    const nextIndex = currentIndex + 1;
    if (nextIndex >= segmentMap.length) return;

    const nextSegment = segmentMap[nextIndex];
    if (!nextSegment) return;

    // Clean up previous prefetch
    if (nextHowlRef.current) {
      nextHowlRef.current.unload();
      nextHowlRef.current = null;
    }

    // Create new Howl for next segment (preload only, don't play)
    try {
      nextHowlRef.current = new Howl({
        src: [nextSegment.audioUrl],
        preload: true,
        html5: true, // Use HTML5 Audio for better compatibility on mobile
      });
    } catch (error) {
      console.error("Failed to prefetch next segment:", error);
    }
  }, []);

  // Handle time updates (manual polling since Howler doesn't have timeupdate event)
  const startTimeUpdateLoop = useCallback(() => {
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
    }

    timeUpdateIntervalRef.current = setInterval(() => {
      if (!isSeekingRef.current && howlRef.current && isPlayingRef.current) {
        const realTime = howlRef.current.seek();
        const virtualTime = calculateVirtualTime();

        setState((prev) => ({
          ...prev,
          currentTime: typeof realTime === "number" ? realTime : 0,
          virtualTime: virtualTime,
        }));

        virtualTimeRef.current = virtualTime;

        // Check if we've reached the end of current segment
        const segmentMap = segmentMapRef.current;
        const currentIndex = currentSegmentRef.current;
        if (segmentMap.length && currentIndex < segmentMap.length) {
          const currentSegment = segmentMap[currentIndex];
          if (
            typeof realTime === "number" &&
            realTime >= currentSegment.endTimestamp - 0.1
          ) {
            handleSegmentEnd();
          }
        }
      }
    }, 100); // Update every 100ms
  }, [calculateVirtualTime]);

  const stopTimeUpdateLoop = useCallback(() => {
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
      timeUpdateIntervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimeUpdateLoop();
      if (howlRef.current) {
        howlRef.current.unload();
      }
      if (nextHowlRef.current) {
        nextHowlRef.current.unload();
      }
    };
  }, [stopTimeUpdateLoop]);

  // Keep refs in sync and rebuild segment map when playlist changes
  useEffect(() => {
    playlistRef.current = state.currentPlaylist;
    currentSegmentRef.current = state.currentSegmentIndex;

    if (state.currentPlaylist) {
      const segmentMap = buildSegmentMap(state.currentPlaylist);
      segmentMapRef.current = segmentMap;

      // Calculate total duration
      const totalDuration =
        segmentMap.length > 0
          ? segmentMap[segmentMap.length - 1].virtualEnd
          : 0;

      setState((prev) => ({
        ...prev,
        totalDuration: totalDuration,
      }));
    }
  }, [state.currentPlaylist, state.currentSegmentIndex, buildSegmentMap]);

  // Keep queue ref in sync
  useEffect(() => {
    queueRef.current = state.queue;
  }, [state.queue]);

  const updateState = useCallback((updates) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Load audio for a specific segment
  const loadSegmentAudio = useCallback(
    (segmentOrIndex, seekOffset = 0) => {
      const segmentMap = segmentMapRef.current;
      const currentPlaylistId = playlistIdRef.current;

      // Handle both segment object and index
      let segment;
      if (typeof segmentOrIndex === "number") {
        if (segmentOrIndex < 0 || segmentOrIndex >= segmentMap.length) {
          return;
        }
        segment = segmentMap[segmentOrIndex];
      } else {
        segment = segmentOrIndex;
      }

      if (!segment) {
        return;
      }

      if (!segment.audioUrl) {
        updateState({ isLoading: false, error: "No audio URL for segment" });
        return;
      }

      const targetTime = segment.startTimestamp + seekOffset;

      // Check if we can reuse the prefetched next segment
      const isPrefetched =
        nextHowlRef.current &&
        nextHowlRef.current._src === segment.audioUrl &&
        nextHowlRef.current.state() === "loaded";

      if (isPrefetched && nextHowlRef.current) {
        // Swap the prefetched Howl to be the current one
        if (howlRef.current) {
          howlRef.current.unload();
        }
        howlRef.current = nextHowlRef.current;
        nextHowlRef.current = null;

        // Seek to the target time
        howlRef.current.seek(targetTime);

        // Set playback rate
        howlRef.current.rate(state.playbackRate);

        updateState({ isLoading: false });

        // Prefetch the next segment
        prefetchNextSegment();
      } else {
        // Need to load new file
        updateState({ isLoading: true });

        // Clean up old howl
        if (howlRef.current) {
          howlRef.current.unload();
        }

        // Create new Howl instance
        howlRef.current = new Howl({
          src: [segment.audioUrl],
          html5: true, // Use HTML5 Audio for better compatibility
          preload: true,
          onload: () => {
            // Check if playlist changed while loading
            if (playlistIdRef.current !== currentPlaylistId) {
              return;
            }
            if (howlRef.current) {
              howlRef.current.seek(targetTime);
              howlRef.current.rate(state.playbackRate);
              updateState({ isLoading: false });
              // Prefetch next segment after loading
              prefetchNextSegment();
            }
          },
          onloaderror: (id, error) => {
            console.error("Failed to load audio:", segment.audioUrl, error);
            updateState({
              isLoading: false,
              error: `Failed to load audio: ${error}`,
            });
          },
          onplayerror: (id, error) => {
            console.error("Playback error:", error);
            updateState({ error: `Playback failed: ${error}` });
          },
        });
      }
    },
    [state.playbackRate, updateState, prefetchNextSegment],
  );

  // Handle playlist end - move to queue or fully reset
  const handlePlaylistEnd = useCallback(() => {
    isPlayingRef.current = false;
    stopTimeUpdateLoop();

    // Check if there's a queued playlist
    const queue = queueRef.current;
    if (queue.length > 0) {
      const nextPlaylist = queue[0];
      const remainingQueue = queue.slice(1);

      updateState({
        currentPlaylist: nextPlaylist,
        queue: remainingQueue,
        currentSegmentIndex: 0,
        currentTime: 0,
        isPlaying: false,
        isPaused: false,
      });

      if (nextPlaylist && nextPlaylist.length > 0) {
        loadSegmentAudio(nextPlaylist[0]);
        setTimeout(() => {
          if (howlRef.current) {
            howlRef.current.play();
            isPlayingRef.current = true;
            startTimeUpdateLoop();
            updateState({ isPlaying: true });
          }
        }, 100);
      }
    } else {
      // No queue - full reset to initial state
      if (howlRef.current) {
        howlRef.current.unload();
        howlRef.current = null;
      }
      if (nextHowlRef.current) {
        nextHowlRef.current.unload();
        nextHowlRef.current = null;
      }
      segmentMapRef.current = [];

      updateState({
        currentPlaylist: null,
        queue: [],
        isPlaying: false,
        isPaused: false,
        currentSegmentIndex: 0,
        currentTime: 0,
        virtualTime: 0,
        totalDuration: 0,
        isMinimized: false,
        currentStoryId: null,
        currentStoryData: null,
      });
    }
  }, [loadSegmentAudio, updateState, stopTimeUpdateLoop, startTimeUpdateLoop]);

  // Handle segment end - move to next segment or playlist
  const handleSegmentEnd = useCallback(() => {
    const segmentMap = segmentMapRef.current;
    const currentIndex = currentSegmentRef.current;
    const wasPlaying = isPlayingRef.current;

    if (!segmentMap || !segmentMap.length) return;

    // Move to next segment
    const nextIndex = currentIndex + 1;
    if (nextIndex < segmentMap.length) {
      // Pause current audio before loading next segment
      if (howlRef.current) {
        howlRef.current.pause();
      }

      updateState({ currentSegmentIndex: nextIndex });
      loadSegmentAudio(nextIndex);

      if (wasPlaying) {
        // Wait for audio to be loaded before playing
        const tryPlay = () => {
          if (howlRef.current && howlRef.current.state() === "loaded") {
            howlRef.current.play();
            isPlayingRef.current = true;
            startTimeUpdateLoop();
          } else {
            setTimeout(tryPlay, 50);
          }
        };
        setTimeout(tryPlay, 50);
      }
    } else {
      // Playlist ended - stop playback
      if (howlRef.current) {
        howlRef.current.pause();
      }
      stopTimeUpdateLoop();
      handlePlaylistEnd();
    }
  }, [
    loadSegmentAudio,
    updateState,
    handlePlaylistEnd,
    startTimeUpdateLoop,
    stopTimeUpdateLoop,
  ]);

  // Load playlist with options
  const loadPlaylist = useCallback(
    (playlistData, options = {}) => {
      const {
        mode = "replace",
        autoPlay = false,
        clearQueue = false,
        position = "end",
      } = options;

      // Increment playlist ID to invalidate any pending loads
      const thisPlaylistId = ++playlistIdRef.current;

      // Note: We allow concurrent loads - the playlist ID mechanism handles
      // invalidating stale loads. This allows a more complete playlist to
      // replace a partial one that's still loading.

      if (!playlistData || !playlistData.length) {
        // Clear the current playlist
        if (howlRef.current) {
          howlRef.current.pause();
          howlRef.current.unload();
          howlRef.current = null;
        }
        if (nextHowlRef.current) {
          nextHowlRef.current.unload();
          nextHowlRef.current = null;
        }
        stopTimeUpdateLoop();
        isPlayingRef.current = false;
        isLoadingPlaylistRef.current = false;

        updateState({
          currentPlaylist: null,
          currentSegmentIndex: 0,
          isPlaying: false,
          queue: clearQueue ? [] : state.queue,
        });
        return;
      }

      if (mode === "queue") {
        // Add to queue
        const newQueue =
          position === "next"
            ? [playlistData, ...state.queue]
            : [...state.queue, playlistData];

        updateState({ queue: newQueue });
      } else {
        // Replace mode
        isLoadingPlaylistRef.current = true;

        // Stop any existing playback first
        if (howlRef.current) {
          howlRef.current.pause();
          howlRef.current.unload();
          howlRef.current = null;
        }
        if (nextHowlRef.current) {
          nextHowlRef.current.unload();
          nextHowlRef.current = null;
        }
        stopTimeUpdateLoop();
        isPlayingRef.current = false;

        const segmentMap = buildSegmentMap(playlistData);
        segmentMapRef.current = segmentMap;

        // Calculate total duration
        const totalDuration =
          segmentMap.length > 0
            ? segmentMap[segmentMap.length - 1].virtualEnd
            : 0;

        updateState({
          currentPlaylist: playlistData,
          currentSegmentIndex: 0,
          currentTime: 0,
          virtualTime: 0,
          totalDuration: totalDuration,
          isPlaying: false,
          isPaused: false,
          error: null,
          queue: clearQueue ? [] : state.queue,
        });

        // Load first segment
        if (segmentMap.length > 0) {
          loadSegmentAudio(segmentMap[0]);

          if (autoPlay) {
            // Auto-play after loading with retry logic
            const tryPlay = (attempts = 0) => {
              // Check if playlist changed
              if (playlistIdRef.current !== thisPlaylistId) {
                isLoadingPlaylistRef.current = false;
                return;
              }

              if (!howlRef.current || howlRef.current.state() === "unloaded") {
                // Audio failed to load or was unloaded
                console.warn(
                  "Audio not available for playback — load failed or was cancelled",
                );
                isLoadingPlaylistRef.current = false;
                return;
              } else if (howlRef.current.state() === "loaded") {
                howlRef.current.play();
                isPlayingRef.current = true;
                isLoadingPlaylistRef.current = false;
                startTimeUpdateLoop();
                updateState({ isPlaying: true, isPaused: false });
              } else if (attempts < 50) {
                // Retry for up to 5 seconds (50 * 100ms)
                setTimeout(() => tryPlay(attempts + 1), 100);
              } else {
                console.error("Timeout waiting for audio to load");
                isLoadingPlaylistRef.current = false;
                updateState({ error: "Timeout waiting for audio to load" });
              }
            };
            setTimeout(() => tryPlay(0), 100);
          } else {
            isLoadingPlaylistRef.current = false;
          }
        } else {
          isLoadingPlaylistRef.current = false;
        }
      }
    },
    [
      state.queue,
      buildSegmentMap,
      loadSegmentAudio,
      updateState,
      stopTimeUpdateLoop,
      startTimeUpdateLoop,
    ],
  );

  const play = useCallback(() => {
    if (!howlRef.current) return;

    howlRef.current.play();
    isPlayingRef.current = true;
    startTimeUpdateLoop();

    updateState({
      isPlaying: true,
      isPaused: false,
      error: null,
    });
  }, [updateState, startTimeUpdateLoop]);

  const pause = useCallback(() => {
    if (!howlRef.current) return;

    howlRef.current.pause();
    isPlayingRef.current = false;
    stopTimeUpdateLoop();

    updateState({
      isPlaying: false,
      isPaused: true,
    });
  }, [updateState, stopTimeUpdateLoop]);

  const stop = useCallback(() => {
    if (howlRef.current) {
      howlRef.current.stop();
      howlRef.current.unload();
      howlRef.current = null;
    }
    if (nextHowlRef.current) {
      nextHowlRef.current.unload();
      nextHowlRef.current = null;
    }

    isPlayingRef.current = false;
    stopTimeUpdateLoop();
    segmentMapRef.current = [];

    // Full reset to initial state
    updateState({
      currentPlaylist: null,
      queue: [],
      isPlaying: false,
      isPaused: false,
      currentSegmentIndex: 0,
      currentTime: 0,
      virtualTime: 0,
      totalDuration: 0,
      isMinimized: false,
      currentStoryId: null,
      currentStoryData: null,
    });
  }, [updateState, stopTimeUpdateLoop]);

  const togglePlayPause = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);

  const seekTo = useCallback(
    (virtualTime) => {
      const segmentMap = segmentMapRef.current;
      if (!segmentMap.length) return;

      const wasPlaying = isPlayingRef.current;

      // Find which segment contains this virtual time
      let targetSegment = null;
      let targetIndex = -1;

      for (let i = 0; i < segmentMap.length; i++) {
        const segment = segmentMap[i];
        if (
          virtualTime >= segment.virtualStart &&
          virtualTime <= segment.virtualEnd
        ) {
          targetSegment = segment;
          targetIndex = i;
          break;
        }
      }

      // If not found, seek to start of last segment
      if (!targetSegment) {
        if (virtualTime < 0) {
          targetSegment = segmentMap[0];
          targetIndex = 0;
        } else {
          targetSegment = segmentMap[segmentMap.length - 1];
          targetIndex = segmentMap.length - 1;
        }
      }

      if (!targetSegment) return;

      // Calculate offset within the segment
      const offsetInSegment = virtualTime - targetSegment.virtualStart;
      const needsSegmentChange = targetIndex !== currentSegmentRef.current;

      isSeekingRef.current = true;

      if (needsSegmentChange) {
        // Need to load a different segment
        if (howlRef.current) {
          howlRef.current.pause();
        }
        stopTimeUpdateLoop();

        updateState({ currentSegmentIndex: targetIndex, virtualTime });
        loadSegmentAudio(targetIndex, offsetInSegment);

        if (wasPlaying) {
          const tryPlay = () => {
            if (howlRef.current && howlRef.current.state() === "loaded") {
              howlRef.current.play();
              isPlayingRef.current = true;
              startTimeUpdateLoop();
              isSeekingRef.current = false;
            } else {
              setTimeout(tryPlay, 50);
            }
          };
          setTimeout(tryPlay, 50);
        } else {
          isSeekingRef.current = false;
        }
      } else {
        // Same segment, just seek within it
        const realTime = targetSegment.startTimestamp + offsetInSegment;
        if (howlRef.current) {
          howlRef.current.seek(realTime);
        }

        updateState({
          virtualTime: virtualTime,
        });

        setTimeout(() => {
          isSeekingRef.current = false;
        }, 100);
      }
    },
    [loadSegmentAudio, updateState, stopTimeUpdateLoop, startTimeUpdateLoop],
  );

  const playSegment = useCallback(
    (segmentIndex) => {
      const segmentMap = segmentMapRef.current;
      if (!segmentMap.length || segmentIndex >= segmentMap.length) return;

      updateState({ currentSegmentIndex: segmentIndex });
      loadSegmentAudio(segmentIndex);

      setTimeout(() => {
        if (howlRef.current && howlRef.current.state() === "loaded") {
          howlRef.current.play();
          isPlayingRef.current = true;
          startTimeUpdateLoop();
          updateState({ isPlaying: true, isPaused: false });
        }
      }, 100);
    },
    [loadSegmentAudio, updateState, startTimeUpdateLoop],
  );

  const nextSegment = useCallback(() => {
    const playlist = playlistRef.current;
    const nextIndex = currentSegmentRef.current + 1;
    if (playlist && nextIndex < playlist.length) {
      playSegment(nextIndex);
    }
  }, [playSegment]);

  const previousSegment = useCallback(() => {
    const prevIndex = currentSegmentRef.current - 1;
    if (prevIndex >= 0) {
      playSegment(prevIndex);
    }
  }, [playSegment]);

  const setPlaybackRate = useCallback(
    (rate) => {
      if (howlRef.current) {
        howlRef.current.rate(rate);
      }

      updateState({
        playbackRate: rate,
      });
    },
    [updateState],
  );

  const clearQueue = useCallback(() => {
    updateState({ queue: [] });
  }, [updateState]);

  const removeFromQueue = useCallback(
    (index) => {
      const newQueue = [...state.queue];
      newQueue.splice(index, 1);
      updateState({ queue: newQueue });
    },
    [state.queue, updateState],
  );

  const getCurrentSegment = useCallback(() => {
    const segmentMap = segmentMapRef.current;
    const currentIndex = currentSegmentRef.current;

    if (!segmentMap.length || currentIndex >= segmentMap.length) {
      return null;
    }

    return segmentMap[currentIndex];
  }, []);

  const getSegmentMap = useCallback(() => {
    return segmentMapRef.current;
  }, []);

  const getCurrentVerse = useCallback(() => {
    const segment = getCurrentSegment();
    if (!segment) return null;

    const timestamps = segment.timingData?.timestamps || [];
    const currentTime = howlRef.current ? howlRef.current.seek() : 0;

    // Parse the reference to extract book, chapter, verse info
    const refMatch = segment.reference?.match(/^([A-Z0-9]+)\s+(\d+):(.+)$/i);
    if (!refMatch) return null;

    const book = refMatch[1];
    const chapter = refMatch[2];
    const verseSpec = refMatch[3];

    // Parse verse specification (can be "1-3", "4", "5-7,9-11", etc.)
    let verses = [];
    const parts = verseSpec.split(",");

    for (const part of parts) {
      const rangeParts = part.trim().split("-");
      if (rangeParts.length === 2) {
        const start = parseInt(rangeParts[0]);
        const end = parseInt(rangeParts[1]);
        for (let v = start; v <= end; v++) {
          verses.push(v);
        }
      } else if (rangeParts.length === 1) {
        const start = parseInt(rangeParts[0]);
        const end = parseInt(rangeParts[0]);
        for (let v = start; v <= end; v++) {
          verses.push(v);
        }
      }
    }

    if (!verses.length || !timestamps.length) return null;

    // Find which verse we're currently at based on timestamp
    let currentVerseIndex = 0;
    for (let i = 0; i < timestamps.length - 1; i++) {
      if (
        typeof currentTime === "number" &&
        currentTime >= timestamps[i] &&
        currentTime < timestamps[i + 1]
      ) {
        currentVerseIndex = i;
        break;
      }
    }

    const verseStart = verses[0];
    const verseEnd = verses[verses.length - 1];

    return {
      book,
      chapter: parseInt(chapter),
      verse: verses[currentVerseIndex] || verseStart,
      verseStart,
      verseEnd,
    };
  }, [getCurrentSegment]);

  const toggleMinimized = useCallback(() => {
    updateState({ isMinimized: !state.isMinimized });
  }, [state.isMinimized, updateState]);

  const setMinimized = useCallback(
    (minimized) => {
      updateState({ isMinimized: minimized });
    },
    [updateState],
  );

  const setAudioLanguage = useCallback(
    (langCode) => {
      updateState({ audioLanguage: langCode });
    },
    [updateState],
  );

  const setCurrentStoryId = useCallback(
    (storyId, storyData = null) => {
      updateState({ currentStoryId: storyId, currentStoryData: storyData });
    },
    [updateState],
  );

  const value = {
    ...state,
    loadPlaylist,
    play,
    pause,
    stop,
    togglePlayPause,
    seekTo,
    playSegment,
    nextSegment,
    previousSegment,
    setPlaybackRate,
    clearQueue,
    removeFromQueue,
    getCurrentSegment,
    getSegmentMap,
    getCurrentVerse,
    toggleMinimized,
    setMinimized,
    setAudioLanguage,
    setCurrentStoryId,
  };

  return (
    <MediaPlayerContext.Provider value={value}>
      {children}
    </MediaPlayerContext.Provider>
  );
};

export default MediaPlayerContext;
