import { createEffect, createRoot, createSignal } from 'solid-js'

export type Locale = 'ko' | 'en'

export const LOCALES: Locale[] = ['ko', 'en']
const STORAGE_KEY = 'universe-simulator:locale'

// 사전 렌더링은 한국어, 브라우저에서 저장된 값으로 바꿉니다
const [locale, setLocaleSignal] = createSignal<Locale>('ko')

export { locale }

export function setLocale(next: Locale) {
  setLocaleSignal(next)
  try {
    window.localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // 저장이 막혀도 이번 화면에서는 바뀐 언어를 씁니다
  }
}

let synced = false

/** 저장된 언어를 불러오고 <html lang>을 맞춥니다 (브라우저에서 한 번 호출) */
export function syncLocale() {
  if (synced || typeof window === 'undefined') return
  synced = true
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === 'ko' || saved === 'en') setLocaleSignal(saved)
  } catch {
    // 무시
  }
  createRoot(() => {
    createEffect(() => {
      document.documentElement.lang = locale()
    })
  })
}
