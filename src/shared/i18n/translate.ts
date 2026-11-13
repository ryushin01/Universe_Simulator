import type { Locale } from './locale'

export type Params = Record<string, string | number>

/** 한국어·영어 문장 한 쌍 */
export type Text = Record<Locale, string>

export const both = (ko: string, en: string): Text => ({ ko, en })

/** "{name}" 자리에 값을 넣습니다 */
export function interpolate(template: string, params: Params = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  )
}

/** 두 언어로 같은 틀의 문장을 만듭니다 */
export function compose(build: (locale: Locale) => string): Text {
  return { ko: build('ko'), en: build('en') }
}

/** 사전([한국어, 영어] 쌍)에서 문구를 찾아 보간합니다 */
export function createTranslator<TKey extends string>(
  messages: Record<TKey, readonly [string, string]>,
) {
  return (locale: Locale, key: TKey, params?: Params) =>
    interpolate(messages[key][locale === 'en' ? 1 : 0], params)
}
