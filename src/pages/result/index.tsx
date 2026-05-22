import { useRef, useState } from 'react'
import { View, Text, Image, ScrollView, Canvas } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { Button, Field, Icon, Popup } from '@antmjs/vantui'
import type { WordItem } from '@/types'
import { getWords } from '@/services'
import { parseBatchInput } from '@/utils/words'
import {
  generateId,
  getSession,
  itemsToWords,
  saveRecord,
  setSession,
} from '@/utils/storage'

import './index.scss'

type CropResizeHandle = 'top' | 'right' | 'bottom' | 'left' | 'top-left' | 'top-right' | 'bottom-right' | 'bottom-left'

export default function ResultPage() {
  const [words, setWords] = useState<WordItem[]>([])
  const [imagePath, setImagePath] = useState('')
  const [imagePaths, setImagePaths] = useState<string[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [editVisible, setEditVisible] = useState(false)
  const [addVisible, setAddVisible] = useState(false)
  const [editText, setEditText] = useState('')
  const [addText, setAddText] = useState('')
  const [editingId, setEditingId] = useState('')
  const [cropped, setCropped] = useState(false)
  const [recognizing, setRecognizing] = useState(false)
  const [cropVisible, setCropVisible] = useState(false)
  const [cropTarget, setCropTarget] = useState({
    path: '',
    index: 0,
    paths: [] as string[],
  })
  const [cropImageInfo, setCropImageInfo] = useState({
    width: 0,
    height: 0,
    displayWidth: 0,
    displayHeight: 0,
    left: 0,
    top: 0,
    stageHeight: 0,
    scale: 1,
  })
  const [cropFrame, setCropFrame] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  })
  const cropTouchRef = useRef({
    mode: 'draw',
    x: 0,
    y: 0,
    frameLeft: 0,
    frameTop: 0,
    frameWidth: 0,
    frameHeight: 0,
  })
  const autoCropStarted = useRef(false)

  const syncSession = (patch: { imagePath?: string; imagePaths?: string[]; words?: WordItem[] }) => {
    const session = getSession()
    if (session) {
      setSession({ ...session, ...patch })
    }
  }

  const recognizeImages = async (paths = imagePaths) => {
    if (!paths.length || recognizing) return

    setRecognizing(true)
    try {
      const list = await getWords(paths)
      const next = list.map((text) => ({ id: generateId(), text }))
      setWords(next)
      syncSession({ words: next, imagePath: paths[0], imagePaths: paths })
      Taro.showToast({
        title: next.length ? `识别到 ${next.length} 个` : '未识别到生字',
        icon: next.length ? 'success' : 'none',
      })
    } catch {
      Taro.showToast({ title: '识别失败', icon: 'none' })
    } finally {
      setRecognizing(false)
    }
  }

  const applyCroppedImage = (filePath: string, index: number, paths: string[]) => {
    const nextImagePaths = paths.length ? [...paths] : [filePath]
    nextImagePaths[index] = filePath
    setImagePath(filePath)
    setImagePaths(nextImagePaths)
    setCurrentImageIndex(index)
    setCropped(true)
    syncSession({ imagePath: nextImagePaths[0], imagePaths: nextImagePaths })
    Taro.showToast({ title: '裁剪完成', icon: 'success' })
    recognizeImages(nextImagePaths)
  }

  const openCropper = async (
    path: string,
    index = currentImageIndex,
    paths = imagePaths,
  ) => {
    try {
      const imageInfo = await Taro.getImageInfo({
        src: path,
      })
      const windowInfo = Taro.getWindowInfo()
      const stageHeight = Math.max(windowInfo.windowHeight - 112, 320)
      const scale = Math.min(
        windowInfo.windowWidth / imageInfo.width,
        stageHeight / imageInfo.height,
      )
      const displayWidth = imageInfo.width * scale
      const displayHeight = imageInfo.height * scale
      const left = (windowInfo.windowWidth - displayWidth) / 2
      const top = (stageHeight - displayHeight) / 2

      setCropTarget({
        path,
        index,
        paths: paths.length ? paths : [path],
      })
      setCropImageInfo({
        width: imageInfo.width,
        height: imageInfo.height,
        displayWidth,
        displayHeight,
        left,
        top,
        stageHeight,
        scale,
      })
      setCropFrame({
        left: left + displayWidth * 0.1,
        top: top + displayHeight * 0.1,
        width: displayWidth * 0.8,
        height: displayHeight * 0.8,
      })
      setCropVisible(true)
    } catch {
      Taro.showToast({ title: '图片加载失败', icon: 'none' })
    }
  }

  const handleCrop = () => {
    if (imagePath) openCropper(imagePath)
  }

  const clampCropPoint = (x: number, y: number) => ({
    x: Math.min(Math.max(x, cropImageInfo.left), cropImageInfo.left + cropImageInfo.displayWidth),
    y: Math.min(Math.max(y, cropImageInfo.top), cropImageInfo.top + cropImageInfo.displayHeight),
  })

  const handleCropTouchStart = (e: any) => {
    const point = clampCropPoint(e.touches[0].clientX, e.touches[0].clientY)
    cropTouchRef.current = {
      mode: 'draw',
      x: point.x,
      y: point.y,
      frameLeft: 0,
      frameTop: 0,
      frameWidth: 0,
      frameHeight: 0,
    }
    setCropFrame({
      left: point.x,
      top: point.y,
      width: 0,
      height: 0,
    })
  }

  const handleCropTouchMove = (e: any) => {
    const point = clampCropPoint(e.touches[0].clientX, e.touches[0].clientY)
    const start = cropTouchRef.current
    setCropFrame({
      left: Math.min(start.x, point.x),
      top: Math.min(start.y, point.y),
      width: Math.abs(point.x - start.x),
      height: Math.abs(point.y - start.y),
    })
  }

  const handleFrameTouchStart = (e: any) => {
    e.stopPropagation()
    const point = clampCropPoint(e.touches[0].clientX, e.touches[0].clientY)
    cropTouchRef.current = {
      mode: 'move',
      x: point.x,
      y: point.y,
      frameLeft: cropFrame.left,
      frameTop: cropFrame.top,
      frameWidth: cropFrame.width,
      frameHeight: cropFrame.height,
    }
  }

  const handleFrameTouchMove = (e: any) => {
    e.stopPropagation()
    const point = clampCropPoint(e.touches[0].clientX, e.touches[0].clientY)
    const start = cropTouchRef.current
    const maxLeft = cropImageInfo.left + cropImageInfo.displayWidth - start.frameWidth
    const maxTop = cropImageInfo.top + cropImageInfo.displayHeight - start.frameHeight

    setCropFrame({
      left: Math.min(Math.max(start.frameLeft + point.x - start.x, cropImageInfo.left), maxLeft),
      top: Math.min(Math.max(start.frameTop + point.y - start.y, cropImageInfo.top), maxTop),
      width: start.frameWidth,
      height: start.frameHeight,
    })
  }

  const handleResizeTouchStart = (e: any, handle: CropResizeHandle) => {
    e.stopPropagation()
    const point = clampCropPoint(e.touches[0].clientX, e.touches[0].clientY)
    cropTouchRef.current = {
      mode: handle,
      x: point.x,
      y: point.y,
      frameLeft: cropFrame.left,
      frameTop: cropFrame.top,
      frameWidth: cropFrame.width,
      frameHeight: cropFrame.height,
    }
  }

  const handleResizeTouchMove = (e: any) => {
    e.stopPropagation()
    const point = clampCropPoint(e.touches[0].clientX, e.touches[0].clientY)
    const start = cropTouchRef.current
    const handle = start.mode
    const imageRight = cropImageInfo.left + cropImageInfo.displayWidth
    const imageBottom = cropImageInfo.top + cropImageInfo.displayHeight
    const minSize = 20
    let left = start.frameLeft
    let top = start.frameTop
    let right = start.frameLeft + start.frameWidth
    let bottom = start.frameTop + start.frameHeight

    if (handle.includes('left')) {
      left = Math.min(Math.max(start.frameLeft + point.x - start.x, cropImageInfo.left), right - minSize)
    }
    if (handle.includes('right')) {
      right = Math.max(Math.min(start.frameLeft + start.frameWidth + point.x - start.x, imageRight), left + minSize)
    }
    if (handle.includes('top')) {
      top = Math.min(Math.max(start.frameTop + point.y - start.y, cropImageInfo.top), bottom - minSize)
    }
    if (handle.includes('bottom')) {
      bottom = Math.max(Math.min(start.frameTop + start.frameHeight + point.y - start.y, imageBottom), top + minSize)
    }

    setCropFrame({
      left,
      top,
      width: right - left,
      height: bottom - top,
    })
  }

  const confirmCrop = () => {
    if (cropFrame.width < 20 || cropFrame.height < 20) {
      Taro.showToast({ title: '请拖动选择裁剪区域', icon: 'none' })
      return
    }

    Taro.showLoading({ title: '裁剪中' })
    const sx = (cropFrame.left - cropImageInfo.left) / cropImageInfo.scale
    const sy = (cropFrame.top - cropImageInfo.top) / cropImageInfo.scale
    const sw = cropFrame.width / cropImageInfo.scale
    const sh = cropFrame.height / cropImageInfo.scale
    const ctx = Taro.createCanvasContext('crop-canvas')

    ctx.drawImage(
      cropTarget.path,
      sx,
      sy,
      sw,
      sh,
      0,
      0,
      sw,
      sh,
    )
    ctx.draw(false, () => {
      Taro.canvasToTempFilePath({
        canvasId: 'crop-canvas',
        width: sw,
        height: sh,
        destWidth: sw,
        destHeight: sh,
        success: (res) => {
          Taro.hideLoading()
          setCropVisible(false)
          applyCroppedImage(res.tempFilePath, cropTarget.index, cropTarget.paths)
        },
        fail: () => {
          Taro.hideLoading()
          Taro.showToast({ title: '裁剪失败', icon: 'none' })
        },
      })
    })
  }

  const selectImage = (path: string, index: number) => {
    setImagePath(path)
    setCurrentImageIndex(index)
  }

  useLoad(() => {
    const session = getSession()
    const paths = session?.imagePaths?.length
      ? session.imagePaths
      : session?.imagePath
        ? [session.imagePath]
        : []
    if (!session || !paths.length) {
      Taro.showToast({ title: '暂无图片', icon: 'none' })
      setTimeout(() => Taro.navigateBack(), 1500)
      return
    }
    setImagePath(paths[0])
    setImagePaths(paths)
    setCurrentImageIndex(0)
    setWords(session.words || [])
    setCropped(!!session.words?.length)

    if (!session.words?.length && !autoCropStarted.current) {
      autoCropStarted.current = true
      setTimeout(() => openCropper(paths[0], 0, paths), 400)
    }
  })

  const removeWord = (id: string) => {
    setWords((prev) => prev.filter((w) => w.id !== id))
  }

  const openEdit = (item: WordItem) => {
    setEditingId(item.id)
    setEditText(item.text)
    setEditVisible(true)
  }

  const confirmEdit = () => {
    const list = parseBatchInput(editText)
    if (!list.length) {
      Taro.showToast({ title: '请输入要替换的内容', icon: 'none' })
      return
    }
    const newItems = list.map((text) => ({ id: generateId(), text }))
    setWords((prev) => {
      const next = prev.flatMap((item) =>
        item.id === editingId ? newItems : [item],
      )
      syncSession({ words: next, imagePath: imagePaths[0] || imagePath, imagePaths })
      return next
    })
    setEditVisible(false)
  }

  const confirmAdd = () => {
    const list = parseBatchInput(addText)
    if (!list.length) {
      Taro.showToast({ title: '请输入要添加的生字', icon: 'none' })
      return
    }
    const newItems = list.map((text) => ({ id: generateId(), text }))
    setWords((prev) => {
      const next = [...prev, ...newItems]
      syncSession({ words: next, imagePath: imagePaths[0] || imagePath, imagePaths })
      return next
    })
    setAddText('')
    setAddVisible(false)
    Taro.showToast({ title: `已添加 ${list.length} 个`, icon: 'success' })
  }

  const startDictation = () => {
    if (words.length === 0) {
      Taro.showToast({ title: '请至少保留一个生字', icon: 'none' })
      return
    }

    const wordList = itemsToWords(words)
    const recordId = generateId()
    saveRecord({
      id: recordId,
      title: `听写 ${wordList.slice(0, 3).join('')}${wordList.length > 3 ? '…' : ''}`,
      words: wordList,
      imagePath: imagePaths[0] || imagePath,
      imagePaths: imagePaths.length ? imagePaths : [imagePath],
      createdAt: Date.now(),
    })

    setSession({
      words,
      imagePath: imagePaths[0] || imagePath,
      imagePaths: imagePaths.length ? imagePaths : [imagePath],
      recordId,
    })
    Taro.navigateTo({ url: '/pages/dictation/index' })
  }

  return (
    <View className='result page-container'>
      {imagePath ? (
        <View className='result__preview'>
          <View className='result__image-wrap' onClick={handleCrop}>
            <Image className='result__image' src={imagePath} mode='aspectFit' />
            {imagePaths.length > 1 ? (
              <View className='result__image-count'>
                <Text className='result__image-count-text'>
                  {currentImageIndex + 1}/{imagePaths.length}
                </Text>
              </View>
            ) : null}
          </View>
          {imagePaths.length > 1 ? (
            <ScrollView
              className='result__thumbs'
              scrollX
              showScrollbar={false}
            >
              {imagePaths.map((path, index) => (
                <View
                  key={`${path}_${index}`}
                  className={`result__thumb ${index === currentImageIndex ? 'result__thumb--active' : ''}`}
                  onClick={() => selectImage(path, index)}
                >
                  <Image className='result__thumb-image' src={path} mode='aspectFill' />
                </View>
              ))}
            </ScrollView>
          ) : null}
          <View className='result__image-actions'>
            <Button
              size='small'
              plain
              hairline
              className='result__image-btn'
              icon='edit'
              onClick={handleCrop}
            >
              裁剪图片
            </Button>
            <Button
              size='small'
              plain
              hairline
              className='result__image-btn'
              icon='replay'
              loading={recognizing}
              onClick={() => recognizeImages()}
            >
              重新识别
            </Button>
          </View>
        </View>
      ) : null}

      <View className='result__tip'>
        <Icon name='info-o' size='16px' />
        <Text className='result__tip-text'>
          {words.length > 0
            ? '可点击编辑或删除生字，确认后开始听写'
            : cropped
              ? '请手动添加生字后开始听写'
              : '请先裁剪生字区域，再手动添加生字'}
        </Text>
      </View>

      <ScrollView
        className='result__grid-scroll'
        scrollY
        showScrollbar={false}
        style={{ height: '360px' }}
      >
        <View className='result__grid'>
          {words.map((item) => (
            <View key={item.id} className='result__chip' onClick={() => openEdit(item)}>
              <Text className='result__char'>{item.text}</Text>
              <View
                className='result__chip-delete'
                onClick={(e) => {
                  e.stopPropagation()
                  removeWord(item.id)
                }}
              >
                <Icon name='cross' size='12px' color='#fff' />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {words.length === 0 && (
        <View className='result__empty'>
          <Text>
            {cropped ? '点击下方添加生字' : '裁剪完成后即可添加生字'}
          </Text>
        </View>
      )}

      <View className='result__footer'>
        <Button
          plain
          hairline
          className='result__add-btn'
          icon='plus'
          onClick={() => setAddVisible(true)}
        >
          添加生字
        </Button>
        <Button
          className='result__start-btn'
          block
          disabled={words.length === 0}
          onClick={startDictation}
        >
          开始听写
        </Button>
      </View>

      <Popup
        show={editVisible}
        position='bottom'
        round
        onClose={() => setEditVisible(false)}
      >
        <View className='result__popup'>
          <Text className='result__popup-title'>编辑生字</Text>
          <Field
            type='textarea'
            value={editText}
            placeholder='可用逗号、空格或换行分隔，如：春,夏,秋,冬'
            autosize={{ minHeight: 120 }}
            onChange={(e) => setEditText(e.detail)}
          />
          <Button className='result__confirm-btn' block onClick={confirmEdit}>
            确定
          </Button>
        </View>
      </Popup>

      <Popup
        show={addVisible}
        position='bottom'
        round
        onClose={() => setAddVisible(false)}
      >
        <View className='result__popup'>
          <Text className='result__popup-title'>批量添加生字</Text>
          <Field
            type='textarea'
            value={addText}
            placeholder='多个生字用逗号、空格或换行分隔，如：春,夏,秋,冬'
            autosize={{ minHeight: 120 }}
            onChange={(e) => setAddText(e.detail)}
          />
          <Button className='result__confirm-btn' block onClick={confirmAdd}>
            添加
          </Button>
        </View>
      </Popup>

      {cropVisible ? (
        <View className='result__cropper'>
          <View
            className='result__cropper-stage'
            style={{ height: `${cropImageInfo.stageHeight}px` }}
            onTouchStart={handleCropTouchStart}
            onTouchMove={handleCropTouchMove}
          >
            <Image
              className='result__cropper-image'
              src={cropTarget.path}
              mode='aspectFit'
              style={{
                width: `${cropImageInfo.displayWidth}px`,
                height: `${cropImageInfo.displayHeight}px`,
                left: `${cropImageInfo.left}px`,
                top: `${cropImageInfo.top}px`,
              }}
            />
            <View
              className='result__cropper-frame'
              onTouchStart={handleFrameTouchStart}
              onTouchMove={handleFrameTouchMove}
              style={{
                left: `${cropFrame.left}px`,
                top: `${cropFrame.top}px`,
                width: `${cropFrame.width}px`,
                height: `${cropFrame.height}px`,
              }}
            >
              <View
                className='result__cropper-resize-edge result__cropper-resize-edge--top'
                onTouchStart={(e) => handleResizeTouchStart(e, 'top')}
                onTouchMove={handleResizeTouchMove}
              />
              <View
                className='result__cropper-resize-edge result__cropper-resize-edge--right'
                onTouchStart={(e) => handleResizeTouchStart(e, 'right')}
                onTouchMove={handleResizeTouchMove}
              />
              <View
                className='result__cropper-resize-edge result__cropper-resize-edge--bottom'
                onTouchStart={(e) => handleResizeTouchStart(e, 'bottom')}
                onTouchMove={handleResizeTouchMove}
              />
              <View
                className='result__cropper-resize-edge result__cropper-resize-edge--left'
                onTouchStart={(e) => handleResizeTouchStart(e, 'left')}
                onTouchMove={handleResizeTouchMove}
              />
              <View
                className='result__cropper-resize-dot result__cropper-resize-dot--top-left'
                onTouchStart={(e) => handleResizeTouchStart(e, 'top-left')}
                onTouchMove={handleResizeTouchMove}
              />
              <View
                className='result__cropper-resize-dot result__cropper-resize-dot--top-right'
                onTouchStart={(e) => handleResizeTouchStart(e, 'top-right')}
                onTouchMove={handleResizeTouchMove}
              />
              <View
                className='result__cropper-resize-dot result__cropper-resize-dot--bottom-right'
                onTouchStart={(e) => handleResizeTouchStart(e, 'bottom-right')}
                onTouchMove={handleResizeTouchMove}
              />
              <View
                className='result__cropper-resize-dot result__cropper-resize-dot--bottom-left'
                onTouchStart={(e) => handleResizeTouchStart(e, 'bottom-left')}
                onTouchMove={handleResizeTouchMove}
              />
            </View>
          </View>
          <View className='result__cropper-actions'>
            <Button className='result__cropper-btn result__cropper-btn--primary' onClick={() => setCropVisible(false)}>
              取消
            </Button>
            <Button className='result__cropper-btn result__cropper-btn--primary' onClick={confirmCrop}>
              确认裁剪
            </Button>
          </View>
          <Canvas
            canvasId='crop-canvas'
            className='result__cropper-canvas'
            style={{
              width: `${Math.max(cropFrame.width / cropImageInfo.scale, 1)}px`,
              height: `${Math.max(cropFrame.height / cropImageInfo.scale, 1)}px`,
            }}
          />
        </View>
      ) : null}

    </View>
  )
}
