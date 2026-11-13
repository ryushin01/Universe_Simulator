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
