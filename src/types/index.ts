/** 单个生字/词语 */
export interface WordItem {
  id: string
  text: string
}

/** 历史听写记录（兼容旧数据） */
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
  taskId?: string
  attemptId?: string
  mode?: 'dictation' | 'review'
  startedAt?: number
}

/** 听写任务 */
export interface DictationTask {
  id: string
  title?: string
  words: string[]
  playOrder: number[]
  createdAt: number
}

export type AttemptStatus = 'grading' | 'reviewing' | 'confirmed'
export type AttemptItemResult = 'correct' | 'wrong' | 'uncertain'

/** 单次听写作答 */
export interface DictationAttempt {
  id: string
  taskId: string
  imageUrl?: string
  startedAt: number
  completedAt: number
  score: number
  status: AttemptStatus
  items: AttemptItem[]
}

/** 单题结果 */
export interface AttemptItem {
  index: number
  expected: string
  recognized?: string
  candidates?: string[]
  confidence?: number
  result: AttemptItemResult
  confirmedByUser: boolean
  cropImageUrl?: string
}

export type MistakeStatus = 'learning' | 'mastered'

/** 错词怪兽卡片 */
export interface MistakeCard {
  word: string
  wrongCount: number
  correctStreak: number
  masteryLevel: number
  monsterHp: number
  nextReviewAt: number
  lastWrongAt: number
  status: MistakeStatus
  /** 连续两次复习仍错 → 重点怪兽 */
  focus?: boolean
  consecutiveReviewWrong?: number
}

/** 学习打卡 */
export interface StudyStreak {
  lastStudyDate: string
  streakDays: number
  totalDays: number
}
