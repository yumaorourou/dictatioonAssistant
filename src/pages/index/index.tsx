import { useCallback, useState } from 'react'
import { View, Text, ScrollView, Button as TaroButton } from '@tarojs/components'
import Taro, { useDidShow, useLoad, useShareAppMessage } from '@tarojs/taro'
import {
  Empty,
  Icon,
  SwipeCell,
} from '@antmjs/vantui'
import type { DictationRecord } from '@/types'
import {
  createTaskFromWords,
  deleteRecord,
  formatRecordTime,
  getRecords,
  getStreak,
  getTodayReviewWords,
  getLearningMistakeCards,
  setSession,
  wordsToItems,
} from '@/utils/storage'
import { buildSharePath, parseSharedWords, wasShareTruncated } from '@/utils/share'

import './index.scss'

export default function IndexPage() {
  const [records, setRecords] = useState<DictationRecord[]>([])
  const [streakDays, setStreakDays] = useState(0)
  const [todayCount, setTodayCount] = useState(0)
  const [learningCount, setLearningCount] = useState(0)
  const [shareWords, setShareWords] = useState<string[]>([])
  const [shareTitle, setShareTitle] = useState('听写任务')

  const loadHome = useCallback(() => {
    setRecords(getRecords())
    setStreakDays(getStreak().streakDays)
    setTodayCount(getTodayReviewWords().length)
    setLearningCount(getLearningMistakeCards().length)
  }, [])

  useLoad((query) => {
    const words = parseSharedWords(query?.words)
    if (words.length) {
      const title = query?.title ? decodeURIComponent(query.title) : '好友分享的听写'
      const task = createTaskFromWords(words, { title })
      setSession({
        words: wordsToItems(words),
        taskId: task.id,
        mode: 'dictation',
        startedAt: Date.now(),
      })
      Taro.navigateTo({ url: '/pages/dictation/index' })
    }
  })

  useDidShow(loadHome)

  useShareAppMessage(() => {
    const words = shareWords.length
      ? shareWords
      : records[0]?.words || []
    if (wasShareTruncated(words)) {
      Taro.showToast({ title: '词表较长，已截取前 40 个分享', icon: 'none' })
    }
    return {
      title: shareTitle || '一起来听写',
      path: buildSharePath(words, shareTitle),
    }
  })

  const pickImage = async (sourceType: ('camera' | 'album')[]) => {
    try {
      const res = await Taro.chooseMedia({
        count: sourceType.includes('album') ? 9 : 1,
        mediaType: ['image'],
        sourceType,
      })
      const paths = res.tempFiles.map((file) => file.tempFilePath).filter(Boolean)
      if (!paths.length) return

      setSession({ words: [], imagePath: paths[0], imagePaths: paths })
      Taro.navigateTo({ url: '/pages/result/index' })
    } catch (err) {
      if (err?.errMsg?.includes('cancel')) return
      Taro.showToast({ title: '操作失败', icon: 'none' })
    }
  }

  const openRecord = (record: DictationRecord) => {
    const task = createTaskFromWords(record.words, {
      id: record.id,
      title: record.title,
    })
    setSession({
      words: wordsToItems(record.words),
      recordId: record.id,
      taskId: task.id,
      imagePath: record.imagePath,
      imagePaths: record.imagePaths || (record.imagePath ? [record.imagePath] : []),
      mode: 'dictation',
      startedAt: Date.now(),
    })
    Taro.navigateTo({ url: '/pages/dictation/index' })
  }

  const startTodayReview = () => {
    const words = getTodayReviewWords()
    if (!words.length) {
      Taro.showToast({ title: '今日暂无待复习', icon: 'none' })
      return
    }
    setSession({
      words: wordsToItems(words),
      mode: 'review',
      startedAt: Date.now(),
    })
    Taro.navigateTo({ url: '/pages/dictation/index' })
  }

  const confirmDelete = async (record: DictationRecord) => {
    const { confirm } = await Taro.showModal({
      title: '删除记录',
      content: `确定删除「${record.title}」吗？`,
    })
    if (!confirm) return

    deleteRecord(record.id)
    setRecords((prev) => prev.filter((r) => r.id !== record.id))
    Taro.showToast({ title: '已删除', icon: 'success' })
  }

  return (
    <View className='home page-container'>
      <View className='home__hero'>
        <Text className='home__title'>听写助手</Text>
        <Text className='home__subtitle'>拍照识别生字，轻松完成听写练习</Text>
        <View className='home__streak'>
          <Text className='home__streak-num'>{streakDays}</Text>
          <Text className='home__streak-label'>连续学习天数</Text>
        </View>
      </View>

      <View className='home__quick'>
        <View className='home__quick-card' onClick={startTodayReview}>
          <Text className='home__quick-title'>今日清怪</Text>
          <Text className='home__quick-desc'>
            {todayCount > 0 ? `${todayCount} 个待复习` : '暂无到期错词'}
          </Text>
        </View>
        <View
          className='home__quick-card'
          onClick={() => Taro.navigateTo({ url: '/pages/wrongbook/index' })}
        >
          <Text className='home__quick-title'>错词本</Text>
          <Text className='home__quick-desc'>
            {learningCount > 0 ? `${learningCount} 只怪兽` : '暂无错词'}
          </Text>
        </View>
      </View>

      <View className='home__section'>
        <View className='home__section-content'>
          <View className='home__actions'>
            <View
              className='home__action-card home__action-card--camera'
              onClick={() => pickImage(['camera'])}
            >
              <Icon name='photograph' size='48px' color='#333' />
              <Text className='home__action-label'>拍照识别</Text>
              <Text className='home__action-desc'>拍摄生字页面</Text>
            </View>
            <View
              className='home__action-card home__action-card--album'
              onClick={() => pickImage(['album'])}
            >
              <Icon name='photo-o' size='48px' color='#333' />
              <Text className='home__action-label'>导入图片</Text>
              <Text className='home__action-desc'>从相册选择</Text>
            </View>
          </View>
        </View>
        <View className='home__section-content'>
          <Text className='section-title'>最近记录</Text>
          {records.length === 0 ? (
            <Empty description='暂无听写记录' />
          ) : (
            <View className='card-block home__records'>
              <ScrollView scrollY showScrollbar={false} style={{ height: 375 }} >
                {records.map((record) => (
                  <SwipeCell
                    key={record.id}
                    rightWidth={70}
                    onClick={(e) => {
                      if (e.detail?.position === 'right') {
                        confirmDelete(record)
                      }
                    }}
                    renderRight={
                      <View className='home__delete-btn'>
                        <Text className='home__delete-text'>删除</Text>
                      </View>
                    }
                  >
                    <View className='home__record-row'>
                      <View className='home__record-main' onClick={() => openRecord(record)}>
                        <Text className='home__record-title'>{record.title}</Text>
                        <Text className='home__record-label'>
                          {record.words.join(' ')} · {formatRecordTime(record.createdAt)}
                        </Text>
                      </View>
                      <TaroButton
                        className='home__share-btn'
                        openType='share'
                        onClick={() => {
                          setShareWords(record.words)
                          setShareTitle(record.title)
                        }}
                      >
                        分享
                      </TaroButton>
                    </View>
                  </SwipeCell>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </View>
    </View>
  )
}
