import Taro from '@tarojs/taro'
import type {
  DictationAttempt,
  DictationRecord,
  DictationSession,
  DictationTask,
  MistakeCard,
  StudyStreak,
  WordItem,
} from '@/types'

const RECORDS_KEY = 'dictation_records'
const SESSION_KEY = 'dictation_session'
const TASKS_KEY = 'dictation_tasks'
const ATTEMPTS_KEY = 'dictation_attempts'
const MISTAKES_KEY = 'mistake_cards'
const STREAK_KEY = 'study_streak'

const REVIEW_DAYS = [0, 1, 3, 7, 14] as const
const MAX_HP = 3

export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function getRecords(): DictationRecord[] {
  try {
    return Taro.getStorageSync(RECORDS_KEY) || []
  } catch {
    return []
  }
}

export function saveRecord(record: DictationRecord): void {
  const list = getRecords()
  const idx = list.findIndex((r) => r.id === record.id)
  if (idx >= 0) {
    list[idx] = record
  } else {
    list.unshift(record)
  }
  Taro.setStorageSync(RECORDS_KEY, list.slice(0, 50))
}

export function deleteRecord(id: string): void {
  const list = getRecords().filter((r) => r.id !== id)
  Taro.setStorageSync(RECORDS_KEY, list)
}

export function getSession(): DictationSession | null {
  try {
    return Taro.getStorageSync(SESSION_KEY) || null
  } catch {
    return null
  }
}

export function setSession(session: DictationSession): void {
  Taro.setStorageSync(SESSION_KEY, session)
}

export function wordsToItems(words: string[]): WordItem[] {
  return words.map((text) => ({ id: generateId(), text }))
}

export function itemsToWords(items: WordItem[]): string[] {
  return items.map((w) => w.text)
}

export function formatRecordTime(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatDateKey(ts = Date.now()): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function startOfDay(ts = Date.now()): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function addDays(ts: number, days: number): number {
  return startOfDay(ts) + days * 24 * 60 * 60 * 1000
}

function daysBetween(a: string, b: string): number {
  const ta = new Date(a).getTime()
  const tb = new Date(b).getTime()
  return Math.round((tb - ta) / (24 * 60 * 60 * 1000))
}

/** —— Tasks —— */

export function getTasks(): DictationTask[] {
  try {
    return Taro.getStorageSync(TASKS_KEY) || []
  } catch {
    return []
  }
}

export function getTask(id: string): DictationTask | null {
  return getTasks().find((t) => t.id === id) || null
}

export function saveTask(task: DictationTask): void {
  const list = getTasks()
  const idx = list.findIndex((t) => t.id === task.id)
  if (idx >= 0) {
    list[idx] = task
  } else {
    list.unshift(task)
  }
  Taro.setStorageSync(TASKS_KEY, list.slice(0, 100))
}

export function createTaskFromWords(
  words: string[],
  options?: { title?: string; playOrder?: number[]; id?: string },
): DictationTask {
  const task: DictationTask = {
    id: options?.id || generateId(),
    title:
      options?.title ||
      `听写 ${words.slice(0, 3).join('')}${words.length > 3 ? '…' : ''}`,
    words,
    playOrder: options?.playOrder || words.map((_, i) => i),
    createdAt: Date.now(),
  }
  saveTask(task)
  return task
}

/** —— Attempts —— */

export function getAttempts(): DictationAttempt[] {
  try {
    return Taro.getStorageSync(ATTEMPTS_KEY) || []
  } catch {
    return []
  }
}

export function getAttempt(id: string): DictationAttempt | null {
  return getAttempts().find((a) => a.id === id) || null
}

export function saveAttempt(attempt: DictationAttempt): void {
  const list = getAttempts()
  const idx = list.findIndex((a) => a.id === attempt.id)
  if (idx >= 0) {
    list[idx] = attempt
  } else {
    list.unshift(attempt)
  }
  Taro.setStorageSync(ATTEMPTS_KEY, list.slice(0, 100))
}

export function createGradingAttempt(input: {
  taskId: string
  words: string[]
  startedAt: number
}): DictationAttempt {
  const attempt: DictationAttempt = {
    id: generateId(),
    taskId: input.taskId,
    startedAt: input.startedAt,
    completedAt: Date.now(),
    score: 0,
    status: 'grading',
    items: input.words.map((expected, index) => ({
      index,
      expected,
      result: 'uncertain',
      confirmedByUser: false,
    })),
  }
  saveAttempt(attempt)
  return attempt
}

/** —— Mistake cards —— */

export function getMistakeCards(): MistakeCard[] {
  try {
    return Taro.getStorageSync(MISTAKES_KEY) || []
  } catch {
    return []
  }
}

function saveMistakeCards(list: MistakeCard[]): void {
  Taro.setStorageSync(MISTAKES_KEY, list)
}

export function getMistakeCard(word: string): MistakeCard | null {
  return getMistakeCards().find((m) => m.word === word) || null
}

export function deleteMistakeCard(word: string): void {
  saveMistakeCards(getMistakeCards().filter((m) => m.word !== word))
}

export function markMistakeMastered(word: string): void {
  const list = getMistakeCards()
  const idx = list.findIndex((m) => m.word === word)
  if (idx < 0) return
  list[idx] = {
    ...list[idx],
    status: 'mastered',
    monsterHp: 0,
    masteryLevel: Math.max(list[idx].masteryLevel, 4),
    nextReviewAt: addDays(Date.now(), 14),
    focus: false,
  }
  saveMistakeCards(list)
}

function applyWrong(card: MistakeCard | undefined, word: string, now: number): MistakeCard {
  const prevWrong = card?.consecutiveReviewWrong || 0
  return {
    word,
    wrongCount: (card?.wrongCount || 0) + 1,
    correctStreak: 0,
    masteryLevel: 0,
    monsterHp: MAX_HP,
    nextReviewAt: now,
    lastWrongAt: now,
    status: 'learning',
    consecutiveReviewWrong: prevWrong + 1,
    focus: prevWrong + 1 >= 2 || !!card?.focus,
  }
}

function applyCorrect(card: MistakeCard, now: number): MistakeCard {
  const nextHp = Math.max(0, card.monsterHp - 1)
  const nextLevel = Math.min(4, card.masteryLevel + 1)
  const nextStreak = card.correctStreak + 1
  const mastered = nextHp <= 0 || nextStreak >= 3
  const reviewDays = REVIEW_DAYS[nextLevel] ?? 14

  return {
    ...card,
    monsterHp: nextHp,
    correctStreak: nextStreak,
    masteryLevel: nextLevel,
    consecutiveReviewWrong: 0,
    focus: false,
    status: mastered ? 'mastered' : 'learning',
    nextReviewAt: mastered ? addDays(now, 14) : addDays(now, reviewDays),
  }
}

/** 根据批改结果更新错词本，返回本次新增/仍错的词 */
export function applyAttemptToMistakes(attempt: DictationAttempt): string[] {
  const list = getMistakeCards()
  const map = new Map(list.map((m) => [m.word, m]))
  const wrongWords: string[] = []
  const now = Date.now()

  attempt.items.forEach((item) => {
    if (!item.confirmedByUser) return
    const word = item.expected.trim()
    if (!word) return

    if (item.result === 'wrong') {
      wrongWords.push(word)
      map.set(word, applyWrong(map.get(word), word, now))
      return
    }

    if (item.result === 'correct') {
      const existing = map.get(word)
      if (existing && existing.status === 'learning') {
        map.set(word, applyCorrect(existing, now))
      }
    }
  })

  saveMistakeCards(Array.from(map.values()))
  return wrongWords
}

export function getTodayReviewWords(): string[] {
  const endOfToday = addDays(Date.now(), 1) - 1
  return getMistakeCards()
    .filter((m) => m.status === 'learning' && m.nextReviewAt <= endOfToday)
    .sort((a, b) => {
      if (!!b.focus !== !!a.focus) return b.focus ? 1 : -1
      return b.wrongCount - a.wrongCount
    })
    .map((m) => m.word)
}

export function getDueMistakeCards(): MistakeCard[] {
  const now = Date.now()
  return getMistakeCards()
    .filter((m) => m.status === 'learning' && m.nextReviewAt <= now)
    .sort((a, b) => {
      if (!!b.focus !== !!a.focus) return b.focus ? 1 : -1
      return a.nextReviewAt - b.nextReviewAt
    })
}

export function getFocusMistakeCards(): MistakeCard[] {
  return getMistakeCards()
    .filter((m) => m.status === 'learning' && m.focus)
    .sort((a, b) => b.wrongCount - a.wrongCount)
}

export function getMasteredMistakeCards(): MistakeCard[] {
  return getMistakeCards()
    .filter((m) => m.status === 'mastered')
    .sort((a, b) => b.lastWrongAt - a.lastWrongAt)
}

export function getLearningMistakeCards(): MistakeCard[] {
  return getMistakeCards()
    .filter((m) => m.status === 'learning')
    .sort((a, b) => a.nextReviewAt - b.nextReviewAt)
}

/** —— Streak —— */

export function getStreak(): StudyStreak {
  try {
    return (
      Taro.getStorageSync(STREAK_KEY) || {
        lastStudyDate: '',
        streakDays: 0,
        totalDays: 0,
      }
    )
  } catch {
    return { lastStudyDate: '', streakDays: 0, totalDays: 0 }
  }
}

export function recordStudyDay(ts = Date.now()): StudyStreak {
  const today = formatDateKey(ts)
  const prev = getStreak()
  if (prev.lastStudyDate === today) return prev

  const gap = prev.lastStudyDate ? daysBetween(prev.lastStudyDate, today) : Infinity
  const next: StudyStreak = {
    lastStudyDate: today,
    streakDays: gap === 1 ? prev.streakDays + 1 : 1,
    totalDays: prev.totalDays + 1,
  }
  Taro.setStorageSync(STREAK_KEY, next)
  return next
}

/** 确认批改：写结果、更新错词与打卡 */
export function confirmAttemptGrading(
  attemptId: string,
  results: { index: number; result: 'correct' | 'wrong' }[],
): DictationAttempt | null {
  const attempt = getAttempt(attemptId)
  if (!attempt) return null

  const resultMap = new Map(results.map((r) => [r.index, r.result]))
  const items = attempt.items.map((item) => {
    const result = resultMap.get(item.index)
    if (!result) return item
    return {
      ...item,
      result,
      confirmedByUser: true,
    }
  })

  const confirmed = items.filter((i) => i.confirmedByUser)
  const correctCount = confirmed.filter((i) => i.result === 'correct').length
  const score = confirmed.length
    ? Math.round((correctCount / confirmed.length) * 100)
    : 0

  const next: DictationAttempt = {
    ...attempt,
    items,
    score,
    status: 'confirmed',
    completedAt: Date.now(),
  }

  saveAttempt(next)
  applyAttemptToMistakes(next)
  recordStudyDay(next.completedAt)
  return next
}

export function getMasteryLabel(level: number): string {
  if (level <= 0) return '刚写错'
  if (level === 1) return '初练'
  if (level === 2) return '巩固'
  if (level === 3) return '强化'
  return '基本掌握'
}

export function formatReviewDate(ts: number): string {
  const today = startOfDay()
  const day = startOfDay(ts)
  const diff = Math.round((day - today) / (24 * 60 * 60 * 1000))
  if (diff <= 0) return '今日'
  if (diff === 1) return '明天'
  return `${diff} 天后`
}
