import { useMemo, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import {
  Button,
  Icon,
  Progress,
  Slider,
  Switch,
} from '@antmjs/vantui'
import { useDictationPlayer } from '@/hooks/useDictationPlayer'
import { getSession, itemsToWords } from '@/utils/storage'

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

  useLoad(() => {
    const session = getSession()
    if (!session?.words?.length) {
      Taro.showToast({ title: '暂无听写内容', icon: 'none' })
      setTimeout(() => Taro.navigateBack(), 1500)
      return
    }
    setWordList(itemsToWords(session.words))
  })

  const player = useDictationPlayer(wordList, speed)

  const speedLabel = useMemo(
    () => SPEED_OPTIONS.find((o) => o.value === speed)?.label || '正常',
    [speed],
  )

  const handleSpeedChange = (val: number) => {
    setSpeed(val)
  }

  return (
    <View className='dictation page-container'>
      <View className='dictation__display'>
        <Text className='dictation__label'>当前播放</Text>
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

      <Button plain block onClick={() => Taro.navigateBack()} className='dictation__back-btn'>
        返回
      </Button>
    </View>
  )
}
