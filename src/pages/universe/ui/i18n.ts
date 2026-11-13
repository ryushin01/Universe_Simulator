import { createSignal } from 'solid-js'
import { interpolate, locale } from '@/shared/i18n'
import type { Params, Text } from '@/shared/i18n'
import { MESSAGES } from './messages'
import { PANEL_MESSAGES } from './panels/messages'

const ALL = { ...MESSAGES, ...PANEL_MESSAGES }

export type MessageKey = keyof typeof ALL

/** 화면 문구 (현재 언어). JSX 안에서 부르면 언어가 바뀔 때 다시 그립니다 */
export function t(key: MessageKey, params?: Params): string {
  return interpolate(ALL[key][locale() === 'en' ? 1 : 0], params)
}

/** 두 언어 문장 한 쌍에서 현재 언어 */
export const pick = (text: Text) => text[locale()]

export const messageEntries = () =>
  Object.entries(ALL) as Array<[string, readonly [string, string]]>

/**
 * 언어를 바꿔도 다시 번역되는 안내문.
 * 문자열 대신 문구를 만드는 함수를 담아 두고 그릴 때 불러 지금 언어로 만듭니다.
 * (조작 결과처럼 한 번만 실행할 일은 함수 밖에서 먼저 실행한 뒤 결과만 담습니다)
 */
export function createMessage() {
  const [make, setMake] = createSignal<() => string>(() => '')
  const message = () => make()()
  const setMessage = (next: () => string) => setMake(() => next)
  return [message, setMessage] as const
}
