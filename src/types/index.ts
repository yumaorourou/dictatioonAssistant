/** 单个生字/词语 */
export interface WordItem {
  id: string
  text: string
}

/** 历史听写记录 */
export interface DictationRecord {
  id: string
  title: string
  words: string[]
  imagePath?: string
  imagePaths?: string[]
  createdAt: number
}

/** 当前听写会话（页面间传递） */
export interface DictationSession {
  words: WordItem[]
  imagePath?: string
  imagePaths?: string[]
  recordId?: string
}
