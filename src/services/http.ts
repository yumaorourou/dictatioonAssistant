import Taro from '@tarojs/taro'
import { md5 } from 'js-md5'

type TRequest = Parameters<typeof Taro.request<any, any>>[0] & {
  need_loading?: boolean
  time?: number
}

type TApiResult = {
  code: number
  msg: string
  result: any | null
  success: boolean
}

export const getSignHeader = () => {
  const timestamp = Date.now().toString()
  const secret = process.env.TARO_APP_SIGN_SECRET || ''

  return {
    timestamp,
    sign: md5(`${secret}${timestamp}${secret}`),
  }
}

const request = async (par: Omit<TRequest, 'success' | 'fail'>): Promise<TApiResult> => {
  const {
    data = {},
    header = {},
    url,
    method,
    need_loading = true,
    ...rest
  } = par || {}

  const innerHeader = {
    'Content-Type': 'application/json', // 默认值
    ...getSignHeader(),
    ...header,
  }
  let host = Taro.getStorageSync('host')
  let innerUrl = url.includes('http') ? url : (host || '') + url
  let innerData = data || {}



  // 开始请求
  return new Promise((resolve, reject) => {
    if (need_loading) {
      Taro.showLoading({
        title: '加载中',
      })
    }

    /** 日志打印 */
    console.debug('url =>', url)
    console.debug('data =>', innerData)

    Taro.request({
      url: innerUrl,
      data: innerData,
      header: {
        ...innerHeader,
        // 'X-User-Token': Taro.getStorageSync('token'),
      },
      method: method || 'POST',
      ...rest,
      mode: 'cors',
      success: async (successCallbackResult) => {
        if (need_loading && successCallbackResult.data) {
          Taro.hideLoading()
        }

        const apiData = successCallbackResult.data

        /** 日志打印 */
        console.debug('resolve =>', apiData)

        // if (successCallbackResult.data.code === 2000000) {
        //   //用户过期重新走登录流程并自动重发请求
        //   // const app = getSysApp()
        //   // await app.qwLogin()
        //   par.time = par.time ? par.time + 1 : 1
        //   if (par.time < 3) {
        //     resolve(request(par))
        //   }
        // } else if (apiData && !apiData.success && apiData.msg) {
        //   Taro.showToast({
        //     title: apiData.msg,
        //     icon: 'error',
        //   })
        // }

        resolve(apiData)
      },
      fail: async (failCallbackResult: any) => {
        if (need_loading) {
          Taro.hideLoading()
        }
        if (failCallbackResult.status !== 200) {
          Taro.showToast({
            title: failCallbackResult?.data?.msg || '',
            icon: 'error',
          })
        }

        /** 日志打印 */
        console.debug('reject =>', failCallbackResult.data)

        reject(failCallbackResult.data)
      },
    })
  })
}

export default request
