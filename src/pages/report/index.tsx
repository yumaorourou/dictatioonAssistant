import { useMemo, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad, useShareAppMessage } from '@tarojs/taro'
import { Button } from '@antmjs/vantui'
import type { DictationAttempt, DictationTask } from '@/types'
import {
  getAttempt,
  getTask,
  setSession,
  wordsToItems,
} from '@/utils/storage'
import { buildSharePath } from '@/utils/share'

import './index.scss'

export default function ReportPage() {
  const [attempt, setAttempt] = useState<DictationAttempt | null>(null)
  const [task, setTask] = useState<DictationTask | null>(null)

  useLoad((query) => {
    const id = query?.attemptId
    if (!id) {
      Taro.showToast({ title: '缺少报告数据', icon: 'none' })
      setTimeout(() => Taro.reLaunch({ url: '/pages/index/index' }), 1200)
      return
    }
    const data = getAttempt(id)
    if (!data) {
      Taro.showToast({ title: '报告不存在', icon: 'none' })
      setTimeout(() => Taro.reLaunch({ url: '/pages/index/index' }), 1200)
      return
    }
    setAttempt(data)
    setTask(getTask(data.taskId))
  })

  useShareAppMessage(() => {
    const words = task?.words || attempt?.items.map((i) => i.expected) || []
    return {
      title: `听写成绩 ${attempt?.score ?? 0} 分，来挑战`,
      path: buildSharePath(words, task?.title),
    }
  })

  const wrongWords = useMemo(
    () =>
      attempt?.items
        .filter((i) => i.result === 'wrong')
        .map((i) => i.expected) || [],
    [attempt],
  )

  const durationText = useMemo(() => {
    if (!attempt) return '—'
    const sec = Math.max(1, Math.round((attempt.completedAt - attempt.startedAt) / 1000))
    if (sec < 60) return `${sec} 秒`
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m} 分 ${s} 秒`
  }, [attempt])

  const reviewWrong = () => {
    if (!wrongWords.length) {
      Taro.showToast({ title: '本次没有错词', icon: 'none' })
      return
    }
    setSession({
      words: wordsToItems(wrongWords),
      taskId: undefined,
      attemptId: undefined,
      mode: 'review',
      startedAt: Date.now(),
    })
    Taro.redirectTo({ url: '/pages/dictation/index' })
  }

  if (!attempt) {
    return (
      <View className='report page-container'>
        <Text>加载中…</Text>
      </View>
    )
  }

  const correctCount = attempt.items.filter((i) => i.result === 'correct').length
  const total = attempt.items.length

  return (
    <View className='report page-container'>
      <View className='report__score-card'>
        <Text className='report__score'>{attempt.score}</Text>
        <Text className='report__score-label'>分</Text>
        <Text className='report__summary'>
          对 {correctCount} / {total} · 错 {wrongWords.length} · 用时 {durationText}
        </Text>
      </View>

      <View className='report__section'>
        <Text className='section-title'>错词</Text>
        {wrongWords.length === 0 ? (
          <Text className='report__empty'>全部正确，太棒了！</Text>
        ) : (
          <View className='report__chips'>
            {wrongWords.map((word) => (
              <View key={word} className='report__chip'>
                <Text>{word}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View className='report__actions'>
        {wrongWords.length > 0 ? (
          <Button className='report__primary' block onClick={reviewWrong}>
            立即复习错词
          </Button>
        ) : null}
        <Button
          plain
          block
          className='report__secondary'
          onClick={() => Taro.navigateTo({ url: '/pages/wrongbook/index' })}
        >
          查看错词本
        </Button>
        <Button
          plain
          block
          className='report__secondary'
          onClick={() => Taro.reLaunch({ url: '/pages/index/index' })}
        >
          回首页
        </Button>
      </View>
    </View>
  )
}
