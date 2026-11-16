import { useMemo, useState } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { Button, Icon } from '@antmjs/vantui'
import type { AttemptItemResult, DictationAttempt } from '@/types'
import { confirmAttemptGrading, getAttempt } from '@/utils/storage'

import './index.scss'

type MarkState = AttemptItemResult | 'unset'

export default function GradePage() {
  const [attempt, setAttempt] = useState<DictationAttempt | null>(null)
  const [marks, setMarks] = useState<Record<number, MarkState>>({})

  useLoad((query) => {
    const id = query?.attemptId
    if (!id) {
      Taro.showToast({ title: '缺少批改数据', icon: 'none' })
      setTimeout(() => Taro.navigateBack(), 1200)
      return
    }
    const data = getAttempt(id)
    if (!data) {
      Taro.showToast({ title: '批改记录不存在', icon: 'none' })
      setTimeout(() => Taro.navigateBack(), 1200)
      return
    }
    setAttempt(data)
    const initial: Record<number, MarkState> = {}
    data.items.forEach((item) => {
      initial[item.index] = item.confirmedByUser ? item.result : 'unset'
    })
    setMarks(initial)
  })

  const stats = useMemo(() => {
    const values = Object.values(marks)
    const correct = values.filter((v) => v === 'correct').length
    const wrong = values.filter((v) => v === 'wrong').length
    const unset = values.filter((v) => v === 'unset' || v === 'uncertain').length
    return { correct, wrong, unset, total: values.length }
  }, [marks])

  const setMark = (index: number, result: 'correct' | 'wrong') => {
    setMarks((prev) => ({ ...prev, [index]: result }))
  }

  const markAllCorrect = () => {
    if (!attempt) return
    const next: Record<number, MarkState> = {}
    attempt.items.forEach((item) => {
      next[item.index] = 'correct'
    })
    setMarks(next)
  }

  const submit = () => {
    if (!attempt) return
    if (stats.unset > 0) {
      Taro.showToast({ title: `还有 ${stats.unset} 题未标记`, icon: 'none' })
      return
    }

    const results = attempt.items.map((item) => ({
      index: item.index,
      result: (marks[item.index] === 'wrong' ? 'wrong' : 'correct') as 'correct' | 'wrong',
    }))

    const next = confirmAttemptGrading(attempt.id, results)
    if (!next) {
      Taro.showToast({ title: '提交失败', icon: 'none' })
      return
    }

    Taro.redirectTo({ url: `/pages/report/index?attemptId=${next.id}` })
  }

  if (!attempt) {
    return (
      <View className='grade page-container'>
        <Text>加载中…</Text>
      </View>
    )
  }

  return (
    <View className='grade page-container'>
      <View className='grade__banner'>
        <Text className='grade__banner-title'>对照标准答案，逐题点对或错</Text>
        <Text className='grade__banner-desc'>
          已标对 {stats.correct} · 已标错 {stats.wrong} · 未标 {stats.unset}
        </Text>
      </View>

      <ScrollView scrollY className='grade__list' showScrollbar={false}>
        {attempt.items.map((item) => {
          const mark = marks[item.index] || 'unset'
          return (
            <View
              key={item.index}
              className={`grade__item grade__item--${mark}`}
            >
              <View className='grade__item-main'>
                <Text className='grade__item-index'>第 {item.index + 1} 题</Text>
                <Text className='grade__item-answer'>{item.expected}</Text>
              </View>
              <View className='grade__item-actions'>
                <View
                  className={`grade__mark grade__mark--correct ${mark === 'correct' ? 'is-active' : ''}`}
                  onClick={() => setMark(item.index, 'correct')}
                >
                  <Icon name='success' size='18px' />
                  <Text>对</Text>
                </View>
                <View
                  className={`grade__mark grade__mark--wrong ${mark === 'wrong' ? 'is-active' : ''}`}
                  onClick={() => setMark(item.index, 'wrong')}
                >
                  <Icon name='cross' size='18px' />
                  <Text>错</Text>
                </View>
              </View>
            </View>
          )
        })}
      </ScrollView>

      <View className='grade__footer'>
        <Button plain hairline className='grade__secondary' onClick={markAllCorrect}>
          全部正确
        </Button>
        <Button className='grade__submit' block onClick={submit}>
          提交批改
        </Button>
      </View>
    </View>
  )
}
