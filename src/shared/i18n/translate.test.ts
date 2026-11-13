import { compose, createTranslator, interpolate } from './translate'

describe('i18n', () => {
  it('자리 표시를 값으로 바꾸고, 없는 값은 그대로 둔다', () => {
    expect(interpolate('{body}까지 {au} AU', { body: '화성', au: 1.5 })).toBe(
      '화성까지 1.5 AU',
    )
    expect(interpolate('{x} 남음')).toBe('{x} 남음')
  })

  it('[한국어, 영어] 사전에서 언어별 문구를 고른다', () => {
    const t = createTranslator({ hi: ['안녕 {name}', 'Hello {name}'] })
    expect(t('en', 'hi', { name: 'Mars' })).toBe('Hello Mars')
    expect(t('ko', 'hi', { name: '화성' })).toBe('안녕 화성')
  })

  it('두 언어 문장을 같은 틀로 만든다', () => {
    expect(compose((l) => (l === 'ko' ? '가' : 'A'))).toEqual({
      ko: '가',
      en: 'A',
    })
  })
})
