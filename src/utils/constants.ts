/** 后端 API 根地址，部署时请在微信公众平台配置 request 合法域名 */
export const API_BASE = 'https://api.example.com'

/** 获取生字朗读 MP3 地址 */
export function getWordAudioUrl(word: string, speed = 1): string {
  return `${API_BASE}/api/tts/mp3?word=${encodeURIComponent(word)}&speed=${speed}`
}
