import Taro from '@tarojs/taro'
import type { DictationRecord, DictationSession, WordItem } from '@/types'

const RECORDS_KEY = 'dictation_records'
const SESSION_KEY = 'dictation_session'

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
