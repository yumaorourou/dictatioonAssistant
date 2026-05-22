import { useCallback, useEffect, useRef, useState } from 'react'
import Taro from '@tarojs/taro'
import { getMp3Urls, getWordAudioUrl } from '@/services'
import { WordAudioPlayer } from '@/utils/audio'

function shuffleIndices(len: number): number[] {
  const arr = Array.from({ length: len }, (_, i) => i)
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function useDictationPlayer(initialWords: string[], speed: number) {
  const wordsRef = useRef(initialWords)
  const playOrderRef = useRef(shuffleIndices(initialWords.length))
  const orderIndexRef = useRef(0)
  const intervalRef = useRef(5)
  const repeatCountRef = useRef(3)
  const playingRef = useRef(false)
  const pausedRef = useRef(false)
  const speedRef = useRef(speed)
  const audioUrlsRef = useRef<string[]>([])
  const loadingAudioRef = useRef<Set<number>>(new Set())

  const playerRef = useRef(new WordAudioPlayer())
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [orderIndex, setOrderIndex] = useState(0)
  const [isRandom, setIsRandom] = useState(true)
  const [intervalSec, setIntervalSec] = useState(5)
  const [repeatCount, setRepeatCount] = useState(1)
  const wordsKey = initialWords.join(',')

  const loadAudioUrl = useCallback(async (wordIndex: number) => {
    const word = wordsRef.current[wordIndex]
    if (!word || audioUrlsRef.current[wordIndex] || loadingAudioRef.current.has(wordIndex)) {
      return
    }

    loadingAudioRef.current.add(wordIndex)
    try {
      const urls = await getMp3Urls([word])
      audioUrlsRef.current[wordIndex] = urls[0] || getWordAudioUrl(word)
    } catch {
      audioUrlsRef.current[wordIndex] = getWordAudioUrl(word)
      Taro.showToast({ title: '语音获取失败', icon: 'none' })
    } finally {
      loadingAudioRef.current.delete(wordIndex)
    }
  }, [])

  const preloadAroundOrderIndex = useCallback(
    (oi: number) => {
      const currentWordIndex = playOrderRef.current[oi]
      const nextWordIndex = playOrderRef.current[oi + 1]

      if (currentWordIndex !== undefined) {
        void loadAudioUrl(currentWordIndex)
      }
      if (nextWordIndex !== undefined) {
        void loadAudioUrl(nextWordIndex)
      }
    },
    [loadAudioUrl],
  )

  const ensureAudioUrl = useCallback(
    async (wordIndex: number, word: string) => {
      if (!audioUrlsRef.current[wordIndex]) {
        await loadAudioUrl(wordIndex)
      }
      return audioUrlsRef.current[wordIndex] || getWordAudioUrl(word)
    },
    [loadAudioUrl],
  )

  const syncPlayingState = (playing: boolean, paused: boolean) => {
    playingRef.current = playing
    pausedRef.current = paused
    setIsPlaying(playing)
    setIsPaused(paused)
  }

  wordsRef.current = initialWords
  speedRef.current = speed
  intervalRef.current = intervalSec
  repeatCountRef.current = repeatCount

  const currentWordIndex = playOrderRef.current[orderIndex] ?? 0
  const currentWord = initialWords[currentWordIndex] ?? ''
  const progress =
    initialWords.length > 0
      ? Math.round(((orderIndex + 1) / initialWords.length) * 100)
      : 0

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const playWordByOrderIndex = useCallback(
    async (oi: number, autoAdvance: boolean, playedCount = 1) => {
      const wordIdx = playOrderRef.current[oi]
      const w = wordsRef.current[wordIdx]
      if (!w) return

      preloadAroundOrderIndex(oi)
      const url = await ensureAudioUrl(wordIdx, w)
      playerRef.current.setSpeed(speedRef.current)
      playerRef.current.play(url, {
        onEnded: () => {
          if (!autoAdvance || !playingRef.current || pausedRef.current) return
          clearTimer()

          if (playedCount < repeatCountRef.current) {
            timerRef.current = setTimeout(() => {
              void playWordByOrderIndex(oi, true, playedCount + 1)
            }, 500)
            return
          }

          timerRef.current = setTimeout(() => {
            const nextOi = oi + 1
            if (nextOi >= playOrderRef.current.length) {
              syncPlayingState(false, false)
              Taro.showToast({ title: '听写完成', icon: 'success' })
              return
            }
            orderIndexRef.current = nextOi
            setOrderIndex(nextOi)
            preloadAroundOrderIndex(nextOi)
            void playWordByOrderIndex(nextOi, true)
          }, intervalRef.current * 1000)
        },
        onError: () => {
          Taro.showToast({ title: '音频加载失败', icon: 'none' })
        },
      })
    },
    [clearTimer, ensureAudioUrl, preloadAroundOrderIndex],
  )

  const startPlay = useCallback(() => {
    if (wordsRef.current.length === 0) {
      Taro.showToast({ title: '暂无生字', icon: 'none' })
      return
    }
    clearTimer()
    playerRef.current.stop()
    syncPlayingState(true, false)
    preloadAroundOrderIndex(orderIndexRef.current)
    void playWordByOrderIndex(orderIndexRef.current, true)
  }, [clearTimer, playWordByOrderIndex, preloadAroundOrderIndex])

  const pausePlay = useCallback(() => {
    clearTimer()
    playerRef.current.pause()
    syncPlayingState(false, true)
  }, [clearTimer])

  const resumePlay = useCallback(() => {
    syncPlayingState(true, false)
    playerRef.current.stop()
    preloadAroundOrderIndex(orderIndexRef.current)
    void playWordByOrderIndex(orderIndexRef.current, true)
  }, [playWordByOrderIndex, preloadAroundOrderIndex])

  const togglePlay = useCallback(() => {
    if (playingRef.current) {
      pausePlay()
    } else if (pausedRef.current) {
      resumePlay()
    } else {
      startPlay()
    }
  }, [pausePlay, resumePlay, startPlay])

  const replayCurrent = useCallback(() => {
    clearTimer()
    playerRef.current.stop()
    syncPlayingState(false, false)
    preloadAroundOrderIndex(orderIndexRef.current)
    void playWordByOrderIndex(orderIndexRef.current, false)
  }, [clearTimer, playWordByOrderIndex, preloadAroundOrderIndex])

  const goPrevious = useCallback(() => {
    if (orderIndexRef.current <= 0) {
      Taro.showToast({ title: '已是第一个', icon: 'none' })
      return
    }
    clearTimer()
    playerRef.current.stop()
    orderIndexRef.current -= 1
    setOrderIndex(orderIndexRef.current)
    syncPlayingState(false, false)
    preloadAroundOrderIndex(orderIndexRef.current)
  }, [clearTimer, preloadAroundOrderIndex])

  const goNext = useCallback(() => {
    if (orderIndexRef.current >= playOrderRef.current.length - 1) {
      Taro.showToast({ title: '已是最后一个', icon: 'none' })
      return
    }
    clearTimer()
    playerRef.current.stop()
    orderIndexRef.current += 1
    setOrderIndex(orderIndexRef.current)
    syncPlayingState(false, false)
    preloadAroundOrderIndex(orderIndexRef.current)
  }, [clearTimer, preloadAroundOrderIndex])

  const applyRandom = useCallback(
    (random: boolean) => {
      setIsRandom(random)
      playOrderRef.current = random
        ? shuffleIndices(wordsRef.current.length)
        : wordsRef.current.map((_, i) => i)
      orderIndexRef.current = 0
      setOrderIndex(0)
      audioUrlsRef.current = []
      loadingAudioRef.current.clear()
      clearTimer()
      playerRef.current.stop()
      syncPlayingState(false, false)
      preloadAroundOrderIndex(0)
    },
    [clearTimer, preloadAroundOrderIndex],
  )

  const updateCurrentWord = useCallback((text: string) => {
    const idx = playOrderRef.current[orderIndexRef.current]
    if (idx === undefined) return
    const next = [...wordsRef.current]
    next[idx] = text
    wordsRef.current = next
    return next
  }, [])

  useEffect(() => {
    playerRef.current.setSpeed(speed)
  }, [speed])

  useEffect(() => {
    const nextWords = wordsRef.current
    playOrderRef.current = isRandom
      ? shuffleIndices(nextWords.length)
      : nextWords.map((_, i) => i)
    orderIndexRef.current = 0
    setOrderIndex(0)
    audioUrlsRef.current = []
    loadingAudioRef.current.clear()
    preloadAroundOrderIndex(0)
  }, [wordsKey, isRandom, preloadAroundOrderIndex])

  useEffect(() => {
    const player = playerRef.current
    return () => {
      clearTimer()
      player.destroy()
    }
  }, [clearTimer])

  return {
    currentWord,
    currentWordIndex,
    orderIndex,
    progress,
    isPlaying,
    isPaused,
    isRandom,
    intervalSec,
    repeatCount,
    setIntervalSec,
    setRepeatCount,
    togglePlay,
    replayCurrent,
    goPrevious,
    goNext,
    applyRandom,
    updateCurrentWord,
    getWords: () => [...wordsRef.current],
  }
}
