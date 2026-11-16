/** 微信分享 path 长度有限，词表过长时截断 */
const MAX_SHARE_WORDS = 40

export function buildSharePath(words: string[], title?: string): string {
  const list = words.map((w) => w.trim()).filter(Boolean).slice(0, MAX_SHARE_WORDS)
  const query = [
    `words=${encodeURIComponent(list.join(','))}`,
    title ? `title=${encodeURIComponent(title)}` : '',
  ]
    .filter(Boolean)
    .join('&')
  return `/pages/index/index?${query}`
}

export function parseSharedWords(wordsParam?: string): string[] {
  if (!wordsParam) return []
  try {
    return decodeURIComponent(wordsParam)
      .split(/[,，\s]+/)
      .map((w) => w.trim())
      .filter(Boolean)
  } catch {
    return wordsParam
      .split(/[,，\s]+/)
      .map((w) => w.trim())
      .filter(Boolean)
  }
}

export function wasShareTruncated(words: string[]): boolean {
  return words.length > MAX_SHARE_WORDS
}
