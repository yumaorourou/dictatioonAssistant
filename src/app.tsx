import { Fragment, PropsWithChildren } from 'react'
import { Dialog } from '@antmjs/vantui'

import './app.scss'
import Taro, { useLaunch, usePageNotFound } from '@tarojs/taro'

function App({ children }: PropsWithChildren) {

  /** 检查版本 */
  const checkVersion = () => {
    const updateManager = Taro.getUpdateManager()

    if (updateManager) {
      updateManager.onCheckForUpdate(function () {
        // 请求完新版本信息的回调
      })
      updateManager.onUpdateReady(function () {
        Taro.showModal({
          title: '更新提示',
          content: '新版本已经准备好，是否重启应用？',
          success: function (res) {
            if (res.confirm) {
              // 新的版本已经下载好，调用 applyUpdate 应用新版本并重启
              updateManager.applyUpdate()
            }
          },
        })
      })
      updateManager.onUpdateFailed(function () {
        // 新的版本下载失败
      })
    }
  }

  useLaunch(() => {
    Taro.clearStorage()
    // 版本检测
    checkVersion()

    Taro.getSystemInfo({
      success: (res) => {
        Taro.setStorageSync('platform', res.platform)
        this.setState({ platform: res.platform })
      },
    })
    // 获取小程序基础账号信息
    const { miniProgram } = Taro.getAccountInfoSync()
    Taro.setStorageSync('appId', miniProgram.appId)
    // 设置基础域名,后续可以通过接口获取，暂时先除了测试版本导购小程序全部走正式环境
    Taro.setStorageSync(
      'host',
      'https://www.zxyftek.com'
    )
  })

  /** 错误路径容错 */
  usePageNotFound(() => {
    Taro.redirectTo({
      url: '/pages/index/index',
    })
  })
  return (
    <Fragment>
      {children}
      <Dialog id='van-dialog' />
    </Fragment>
  )
}

export default App
