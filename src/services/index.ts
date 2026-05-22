import Taro from '@tarojs/taro'
import http, { getSignHeader } from './http'

type ApiResponse<T> = {
  code: number
  data?: T
  result?: T
  msg?: string
  success?: boolean
}

const GET_WORDS_URL = '/tingxie/TingxieController/getWords'
const GET_MP3S_URL = '/tingxie/TingxieController/getMp3s'
const MP3_FILE_PREFIX = '/tingxie/mp3'

const getHost = () => Taro.getStorageSync('host') || ''

const getApiUrl = (url: string) => {
  if (url.includes('http')) return url
  return `${getHost()}${url}`
}

const normalizeListResponse = <T,>(res: ApiResponse<T[]>): T[] => {
  if ((res.code !== 200 && res.code !== 2000000) || res.success === false) {
    throw new Error(res.msg || '接口请求失败')
  }
  return res.data || res.result || []
}

const parseUploadResponse = <T,>(data: string): T[] => {
  const res = JSON.parse(data) as ApiResponse<T[]>
  return normalizeListResponse(res)
}

const normalizeAudioUrl = (url: string) => {
  if (/^(https?:|wxfile:|file:|blob:)/.test(url)) return url
  const host = getHost()
  if (!host) return url
  if (url.startsWith('/')) return `${host}${encodeURI(url)}`
  return `${host}/${encodeURI(url)}`
}

export const getPlayableMp3Url = (fileName: string) =>
  normalizeAudioUrl(`${MP3_FILE_PREFIX}/${fileName}`)

export const requestPlayableMp3 = (fileName: string) =>
  Taro.request({
    url: getPlayableMp3Url(fileName),
    method: 'GET',
    responseType: 'arraybuffer',
    header: getSignHeader(),
  })

const getFileCacheName = (fileName: string) => {
  let hash = 0
  for (let i = 0; i < fileName.length; i += 1) {
    hash = (hash * 31 + fileName.charCodeAt(i)) >>> 0
  }
  return `tingxie_${hash}.mp3`
}

export const getPlayableMp3FilePath = async (fileName: string) => {
  const res = await requestPlayableMp3(fileName)
  const fs = Taro.getFileSystemManager()
  const filePath = `${Taro.env.USER_DATA_PATH}/${getFileCacheName(fileName)}`

  await new Promise<void>((resolve, reject) => {
    fs.writeFile({
      filePath,
      data: res.data as ArrayBuffer,
      encoding: 'binary',
      success: () => resolve(),
      fail: reject,
    })
  })

  return filePath
}

export const getWords = async (imagePaths: string[]) => {
  const paths = imagePaths.filter(Boolean)
  if (!paths.length) return []

  Taro.showLoading({ title: '识别中' })
  try {
    const results = await Promise.all(
      paths.map((filePath) =>
        Taro.uploadFile({
          url: getApiUrl(GET_WORDS_URL),
          filePath,
          name: 'files',
          header: getSignHeader(),
        }).then((res) => parseUploadResponse<string>(res.data)),
      ),
    )
    return results.flat().map((word) => word.trim()).filter(Boolean)
  } finally {
    Taro.hideLoading()
  }
}

export const getMp3Urls = async (words: string[]) => {
  const list = words.map((word) => word.trim()).filter(Boolean)
  if (!list.length) return []

  const results = await Promise.all(
    list.map(async (word) => {
      const res = await http({
        url: GET_MP3S_URL,
        method: 'POST',
        data: [word],
        need_loading: false,
      }) as ApiResponse<string[]>

      const fileNames = normalizeListResponse(res)
      return Promise.all(fileNames.map(getPlayableMp3FilePath))
    }),
  )

  return results.flat()
}

export const getWordAudioUrl = (word: string) => getPlayableMp3Url(`${word}.mp3`)
