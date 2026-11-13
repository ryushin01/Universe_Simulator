import { setLocale } from '@/shared/i18n'
import { messageEntries, t } from './i18n'

const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('화면 문구', () => {
  it('모든 문구가 두 언어로 있고 자리 표시가 같다', () => {
    for (const [key, [ko, en]] of messageEntries()) {
      expect(ko, key).not.toBe('')
      expect(en, key).not.toBe('')
      expect(placeholders(ko), key).toEqual(placeholders(en))
    }
  })

  it('언어를 바꾸면 같은 키가 다른 문구를 낸다', () => {
    setLocale('en')
    expect(t('page.start')).toBe('Start exploring')
    setLocale('ko')
    expect(t('page.start')).toBe('탐사 시작')
  })
})
