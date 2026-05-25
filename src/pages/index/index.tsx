import { useCallback, useState } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import {
  Cell,
  Empty,
  Icon,
  SwipeCell,
} from '@antmjs/vantui'
import type { DictationRecord } from '@/types'
import { isLoggedIn, getUserInfo, login } from '@/utils/auth'
import {
  deleteRecord,
  formatRecordTime,
  getRecords,
  setSession,
  wordsToItems,
} from '@/utils/storage'

import './index.scss'

export default function IndexPage() {
  const [records, setRecords] = useState<DictationRecord[]>([])
  const [loggedIn, setLoggedIn] = useState(false)
  const [nickName, setNickName] = useState('')

  const loadRecords = useCallback(() => {
    setRecords(getRecords())
    setLoggedIn(isLoggedIn())
    setNickName(getUserInfo()?.nickName || '')
  }, [])

  useDidShow(loadRecords)

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
    setSession({
      words: wordsToItems(record.words),
      recordId: record.id,
      imagePath: record.imagePath,
      imagePaths: record.imagePaths || (record.imagePath ? [record.imagePath] : []),
    })
    Taro.navigateTo({ url: '/pages/dictation/index' })
  }

  const handleUserClick = async () => {
    if (loggedIn) return
    const ok = await login()
    if (ok) {
      setLoggedIn(true)
      setNickName(getUserInfo()?.nickName || '')
    }
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
      </View>

      {/* <View className='home__user' onClick={handleUserClick}>
        <View className='home__user-avatar'>
          <Icon name={loggedIn ? 'passed' : 'user-o'} size='24px' color='#333' />
        </View>
        <View className='home__user-info'>
          <Text className='home__user-name'>{loggedIn ? nickName || '已登录' : '点击登录'}</Text>
          <Text className='home__user-label'>{loggedIn ? '已解锁听写高级功能' : '登录后可编辑生字、上一词、调速'}</Text>
        </View>
      </View> */}

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
                    <Cell
                      title={record.title}
                      label={`${record.words.join(' ')} · ${formatRecordTime(record.createdAt)}`}
                      isLink
                      onClick={() => openRecord(record)}
                    />
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
