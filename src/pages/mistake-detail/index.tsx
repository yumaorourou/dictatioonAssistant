import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { Button } from '@antmjs/vantui'
import type { MistakeCard } from '@/types'
import {
  deleteMistakeCard,
  formatRecordTime,
  formatReviewDate,
  getMasteryLabel,
  getMistakeCard,
  markMistakeMastered,
  setSession,
  wordsToItems,
} from '@/utils/storage'

import './index.scss'

export default function MistakeDetailPage() {
  const [card, setCard] = useState<MistakeCard | null>(null)
  const [word, setWord] = useState('')

  const reload = (w: string) => {
    setCard(getMistakeCard(w))
  }

  useLoad((query) => {
    const w = query?.word ? decodeURIComponent(query.word) : ''
    if (!w) {
      Taro.showToast({ title: '缺少词语', icon: 'none' })
      setTimeout(() => Taro.navigateBack(), 1200)
      return
    }
    setWord(w)
    const data = getMistakeCard(w)
    if (!data) {
      Taro.showToast({ title: '未找到该错词', icon: 'none' })
      setTimeout(() => Taro.navigateBack(), 1200)
      return
    }
    setCard(data)
  })

  const startPractice = () => {
    if (!word) return
    setSession({
      words: wordsToItems([word]),
      mode: 'review',
      startedAt: Date.now(),
    })
    Taro.navigateTo({ url: '/pages/dictation/index' })
  }

  const handleMaster = async () => {
    const { confirm } = await Taro.showModal({
      title: '标记已掌握',
      content: `确定将「${word}」收进已掌握图鉴吗？`,
    })
    if (!confirm) return
    markMistakeMastered(word)
    reload(word)
    Taro.showToast({ title: '已掌握', icon: 'success' })
  }

  const handleDelete = async () => {
    const { confirm } = await Taro.showModal({
      title: '删除错词',
      content: `确定删除「${word}」吗？`,
    })
    if (!confirm) return
    deleteMistakeCard(word)
    Taro.showToast({ title: '已删除', icon: 'success' })
    setTimeout(() => Taro.navigateBack(), 500)
  }

  if (!card) {
    return (
      <View className='mistake page-container'>
        <Text>加载中…</Text>
      </View>
    )
  }

  return (
    <View className='mistake page-container'>
      <View className='mistake__hero'>
        <Text className='mistake__word'>{card.word}</Text>
        <Text className='mistake__status'>
          {card.status === 'mastered' ? '已掌握' : card.focus ? '重点怪兽' : '学习中'}
        </Text>
      </View>

      <View className='mistake__stats'>
        <View className='mistake__stat'>
          <Text className='mistake__stat-value'>{card.monsterHp}/3</Text>
          <Text className='mistake__stat-label'>生命值</Text>
        </View>
        <View className='mistake__stat'>
          <Text className='mistake__stat-value'>{card.wrongCount}</Text>
          <Text className='mistake__stat-label'>累计错误</Text>
        </View>
        <View className='mistake__stat'>
          <Text className='mistake__stat-value'>{card.correctStreak}</Text>
          <Text className='mistake__stat-label'>连续正确</Text>
        </View>
      </View>

      <View className='mistake__info'>
        <Text className='mistake__row'>掌握等级：{getMasteryLabel(card.masteryLevel)}</Text>
        <Text className='mistake__row'>下次复习：{formatReviewDate(card.nextReviewAt)}</Text>
        <Text className='mistake__row'>最近错误：{formatRecordTime(card.lastWrongAt)}</Text>
      </View>

      <View className='mistake__actions'>
        <Button className='mistake__primary' block onClick={startPractice}>
          立刻听写
        </Button>
        {card.status !== 'mastered' ? (
          <Button plain block onClick={handleMaster}>
            标记已掌握
          </Button>
        ) : null}
        <Button plain block onClick={handleDelete}>
          删除
        </Button>
      </View>
    </View>
  )
}
