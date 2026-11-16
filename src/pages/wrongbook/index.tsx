import { useCallback, useState } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { Button, Empty } from '@antmjs/vantui'
import type { MistakeCard } from '@/types'
import {
  formatReviewDate,
  getFocusMistakeCards,
  getMasteredMistakeCards,
  getMasteryLabel,
  getTodayReviewWords,
  getLearningMistakeCards,
  setSession,
  wordsToItems,
} from '@/utils/storage'

import './index.scss'

type TabKey = 'today' | 'focus' | 'all' | 'mastered'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'today', label: '今日' },
  { key: 'focus', label: '重点' },
  { key: 'all', label: '学习中' },
  { key: 'mastered', label: '已掌握' },
]

export default function WrongbookPage() {
  const [tab, setTab] = useState<TabKey>('today')
  const [todayWords, setTodayWords] = useState<string[]>([])
  const [focusList, setFocusList] = useState<MistakeCard[]>([])
  const [learningList, setLearningList] = useState<MistakeCard[]>([])
  const [masteredList, setMasteredList] = useState<MistakeCard[]>([])

  const reload = useCallback(() => {
    setTodayWords(getTodayReviewWords())
    setFocusList(getFocusMistakeCards())
    setLearningList(getLearningMistakeCards())
    setMasteredList(getMasteredMistakeCards())
  }, [])

  useDidShow(reload)

  const startReview = (words: string[]) => {
    if (!words.length) {
      Taro.showToast({ title: '暂无待复习词', icon: 'none' })
      return
    }
    setSession({
      words: wordsToItems(words),
      mode: 'review',
      startedAt: Date.now(),
    })
    Taro.navigateTo({ url: '/pages/dictation/index' })
  }

  const openDetail = (word: string) => {
    Taro.navigateTo({
      url: `/pages/mistake-detail/index?word=${encodeURIComponent(word)}`,
    })
  }

  const counts: Record<TabKey, number> = {
    today: todayWords.length,
    focus: focusList.length,
    all: learningList.length,
    mastered: masteredList.length,
  }

  const currentList: MistakeCard[] =
    tab === 'focus'
      ? focusList
      : tab === 'mastered'
        ? masteredList
        : tab === 'all'
          ? learningList
          : learningList.filter((m) => todayWords.includes(m.word))

  return (
    <View className='wrongbook page-container'>
      <View className='wrongbook__hero'>
        <Text className='wrongbook__title'>错字怪兽图鉴</Text>
        <Text className='wrongbook__desc'>
          今日待清 {todayWords.length} · 重点 {focusList.length} · 已掌握 {masteredList.length}
        </Text>
        <Button
          className='wrongbook__review-btn'
          block
          onClick={() => startReview(todayWords)}
        >
          今日清怪
        </Button>
      </View>

      <View className='wrongbook__tabs'>
        {TABS.map((item) => (
          <View
            key={item.key}
            className={`wrongbook__tab ${tab === item.key ? 'is-active' : ''}`}
            onClick={() => setTab(item.key)}
          >
            <Text>
              {item.label} {counts[item.key]}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView scrollY className='wrongbook__list' showScrollbar={false}>
        {currentList.length === 0 ? (
          <Empty description='暂无内容' />
        ) : (
          currentList.map((card) => (
            <View
              key={card.word}
              className={`wrongbook__card ${card.focus ? 'wrongbook__card--focus' : ''}`}
              onClick={() => openDetail(card.word)}
            >
              <View className='wrongbook__card-main'>
                <Text className='wrongbook__word'>{card.word}</Text>
                <Text className='wrongbook__meta'>
                  HP {card.monsterHp}/3 · {getMasteryLabel(card.masteryLevel)} · 错 {card.wrongCount} 次
                </Text>
                <Text className='wrongbook__meta'>
                  下次复习：{formatReviewDate(card.nextReviewAt)}
                  {card.focus ? ' · 重点怪兽' : ''}
                </Text>
              </View>
              <Text className='wrongbook__arrow'>详情</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  )
}
