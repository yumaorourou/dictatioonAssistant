import { useMemo, useRef, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad, useShareAppMessage } from '@tarojs/taro'
import {
  Button,
  Icon,
  Progress,
  Slider,
  Switch,
} from '@antmjs/vantui'
import { useDictationPlayer } from '@/hooks/useDictationPlayer'
import {
  createGradingAttempt,
  createTaskFromWords,
  getSession,
  itemsToWords,
  saveTask,
  setSession,
} from '@/utils/storage'
import { buildSharePath, wasShareTruncated } from '@/utils/share'

import './index.scss'

const SPEED_OPTIONS = [
  { label: '慢', value: 0.75 },
  { label: '正常', value: 1 },
  { label: '快', value: 1.25 },
  { label: '很快', value: 1.5 },
]

export default function DictationPage() {
  const [wordList, setWordList] = useState<string[]>([])
  const [speed, setSpeed] = useState(1)
  const [showWord, setShowWord] = useState(false)
  const [taskTitle, setTaskTitle] = useState('听写练习')
  const startedAtRef = useRef(Date.now())
  const taskIdRef = useRef('')

  useLoad(() => {
    const session = getSession()
    if (!session?.words?.length) {
      Taro.showToast({ title: '暂无听写内容', icon: 'none' })
      setTimeout(() => Taro.navigateBack(), 1500)
      return
    }
    const words = itemsToWords(session.words)
    setWordList(words)
    startedAtRef.current = session.startedAt || Date.now()
    taskIdRef.current = session.taskId || ''
    setTaskTitle(
      session.mode === 'review'
        ? '今日清怪'
        : `听写 ${words.slice(0, 3).join('')}${words.length > 3 ? '…' : ''}`,
    )

    if (!session.startedAt) {
      setSession({ ...session, startedAt: startedAtRef.current })
    }
  })

  useShareAppMessage(() => {
    if (wasShareTruncated(wordList)) {
      Taro.showToast({ title: '词表较长，已截取前 40 个分享', icon: 'none' })
    }
    return {
      title: `来一起听写：${taskTitle}`,
      path: buildSharePath(wordList, taskTitle),
    }
  })

  const player = useDictationPlayer(wordList, speed)

  const speedLabel = useMemo(
    () => SPEED_OPTIONS.find((o) => o.value === speed)?.label || '正常',
    [speed],
  )

  const handleSpeedChange = (val: number) => {
    setSpeed(val)
  }

  const goGrade = () => {
    if (!wordList.length) {
      Taro.showToast({ title: '暂无听写内容', icon: 'none' })
      return
    }

    const playOrder = player.getPlayOrder()
    let taskId = taskIdRef.current
    if (!taskId) {
      const task = createTaskFromWords(wordList, {
        title: taskTitle,
        playOrder,
      })
      taskId = task.id
      taskIdRef.current = taskId
    } else {
      saveTask({
        id: taskId,
        title: taskTitle,
        words: wordList,
        playOrder,
        createdAt: startedAtRef.current,
      })
    }

    const attempt = createGradingAttempt({
      taskId,
      words: wordList,
      startedAt: startedAtRef.current,
    })

    const session = getSession()
    if (session) {
      setSession({
        ...session,
        taskId,
        attemptId: attempt.id,
        startedAt: startedAtRef.current,
      })
    }

    Taro.navigateTo({ url: `/pages/grade/index?attemptId=${attempt.id}` })
  }

  return (
    <View className='dictation page-container'>
      <View className='dictation__display'>
        <Text className='dictation__label'>
          {player.isFinished ? '听写已完成' : '当前播放'}
        </Text>
        <Text className={`dictation__char ${showWord ? '' : 'dictation__char--hidden'}`}>
          {player.currentWord || '—'}
        </Text>
        <View
          className='dictation__visibility-btn'
          onClick={() => setShowWord((prev) => !prev)}
        >
          <Icon name={showWord ? 'closed-eye' : 'eye-o'} size='18px' />
          <Text className='dictation__visibility-text'>
            {showWord ? '隐藏词语' : '显示词语'}
          </Text>
        </View>
        <Progress
          percentage={player.progress}
          strokeWidth={8}
          color='#333333'
          pivotText={`${player.progress}%`}
        />
        <Text className='dictation__progress-text'>
          第 {wordList.length ? player.orderIndex + 1 : 0} / {wordList.length} 个
        </Text>
      </View>

      {player.isFinished ? (
        <View className='dictation__finish-actions'>
          <Button className='dictation__grade-btn' block onClick={goGrade}>
            去批改
          </Button>
          <Button
            plain
            block
            onClick={() => {
              player.applyRandom(player.isRandom)
              player.togglePlay()
            }}
            className='dictation__back-btn'
          >
            再听一遍
          </Button>
        </View>
      ) : (
        <View className='dictation__controls'>
          <View
            className='dictation__ctrl-btn'
            onClick={player.goPrevious}
          >
            <Icon name='arrow-left' size='28px' />
            <Text className='dictation__ctrl-btn-text'>上一个</Text>
          </View>
          <View className='dictation__ctrl-btn' onClick={player.replayCurrent}>
            <Icon name='replay' size='28px' />
            <Text className='dictation__ctrl-btn-text'>重播</Text>
          </View>
          <View
            className='dictation__ctrl-btn dictation__ctrl-btn--primary'
            onClick={player.togglePlay}
          >
            <Icon
              name={player.isPlaying ? 'pause-circle-o' : 'play-circle-o'}
              size='28px'
              color='#333333'
            />
            <Text className='dictation__ctrl-btn-text'>{player.isPlaying ? '暂停' : player.isPaused ? '继续' : '开始'}</Text>
          </View>
          <View className='dictation__ctrl-btn' onClick={player.goNext}>
            <Icon name='arrow' size='28px' />
            <Text className='dictation__ctrl-btn-text'>下一个</Text>
          </View>
        </View>
      )}

      <View className='card-block dictation__settings'>
        <View className='dictation__setting-item'>
          <View className='dictation__setting-row'>
            <Text className='dictation__setting-label'>播放间隔</Text>
            <Text className='dictation__setting-value'>{player.intervalSec} 秒</Text>
          </View>
          <Slider
            min={2}
            max={15}
            step={1}
            value={player.intervalSec}
            activeColor='#333333'
            onChange={(e) => player.setIntervalSec(e.detail)}
          />
        </View>

        <View className='dictation__setting-item'>
          <View className='dictation__setting-row'>
            <Text className='dictation__setting-label'>重复次数</Text>
            <Text className='dictation__setting-value'>{player.repeatCount} 次</Text>
          </View>
          <Slider
            min={1}
            max={5}
            step={1}
            value={player.repeatCount}
            activeColor='#333333'
            onChange={(e) => player.setRepeatCount(e.detail)}
          />
        </View>

        <View className='dictation__setting-item'>
          <View className='dictation__setting-row'>
            <Text className='dictation__setting-label'>随机播放</Text>
            <Switch
              checked={player.isRandom}
              activeColor='#333333'
              size='18px'
              onChange={(e) => player.applyRandom(e.detail)}
            />
          </View>
        </View>

        <View className='dictation__setting-item'>
          <View className='dictation__setting-row'>
            <Text className='dictation__setting-label'>
              播报语速 ({speedLabel})
            </Text>
          </View>
          <Slider
            min={0}
            max={3}
            step={1}
            value={SPEED_OPTIONS.findIndex((o) => o.value === speed)}
            activeColor='#333333'
            onChange={(e) => {
              const opt = SPEED_OPTIONS[e.detail]
              if (opt) handleSpeedChange(opt.value)
            }}
          />
          <View className='dictation__speed-tags'>
            {SPEED_OPTIONS.map((opt) => (
              <Text
                key={opt.value}
                className={`dictation__speed-tag ${speed === opt.value ? 'active' : ''}`}
                onClick={() => handleSpeedChange(opt.value)}
              >
                {opt.label}
              </Text>
            ))}
          </View>
        </View>
      </View>

      {!player.isFinished ? (
        <Button plain block onClick={goGrade} className='dictation__back-btn'>
          提前批改
        </Button>
      ) : null}

      <Button plain block onClick={() => Taro.navigateBack({ fail: () => Taro.reLaunch({ url: '/pages/index/index' }) })} className='dictation__back-btn'>
        返回
      </Button>
    </View>
  )
}
