import Taro from '@tarojs/taro'

const TOKEN_KEY = 'user_token'
const USER_KEY = 'user_info'

export interface UserInfo {
  nickName: string
  avatarUrl?: string
}

export function isLoggedIn(): boolean {
  return !!Taro.getStorageSync(TOKEN_KEY)
}

export function getUserInfo(): UserInfo | null {
  return Taro.getStorageSync(USER_KEY) || null
}

/** 微信登录（演示：获取用户信息后写入 token） */
export async function login(): Promise<boolean> {
  try {
    const profile = await Taro.getUserProfile({
      desc: '用于听写助手个性化功能',
    })
    Taro.setStorageSync(TOKEN_KEY, `token_${Date.now()}`)
    Taro.setStorageSync(USER_KEY, {
      nickName: profile.userInfo.nickName,
      avatarUrl: profile.userInfo.avatarUrl,
    })

    return true
  } catch {
    Taro.showToast({ title: '登录已取消', icon: 'none' })
    return false
  }
}

export function logout(): void {
  Taro.removeStorageSync(TOKEN_KEY)
  Taro.removeStorageSync(USER_KEY)
}
