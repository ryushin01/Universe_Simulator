import { STARS, luminosityClass, starClassName } from './catalog'

describe('별의 종류', () => {
  it('분광형의 광도 계급을 읽는다', () => {
    expect(luminosityClass('G2V')).toBe('V')
    expect(luminosityClass('M5.5Ve')).toBe('V')
    expect(luminosityClass('M1-2Ia')).toBe('Ia')
    expect(luminosityClass('M1.5Iab')).toBe('Iab')
    expect(luminosityClass('B1III-IV + B2V')).toBe('III')
    expect(luminosityClass('F5IV-V + DQZ')).toBe('IV')
    expect(luminosityClass('A8m + DA')).toBeNull()
  })

  it('준거성(IV)을 주계열성으로 잘못 부르지 않는다', () => {
    expect(starClassName('G2IV').ko).toBe('준거성')
    expect(starClassName('F5IV-V + DQZ').ko).toBe('준거성')
    expect(starClassName('G2V').ko).toBe('노란 주계열성 (태양형)')
    expect(starClassName('M1-2Ia').ko).toBe('거성·초거성')
    expect(starClassName('A9II').ko).toBe('거성·초거성')
    expect(starClassName('sdM1').ko).toBe('준왜성')
    expect(starClassName('A8m + DA').ko).toBe('흰색 주계열성')
  })

  it('목록의 모든 별에 이름 있는 종류가 붙는다', () => {
    for (const star of STARS)
      expect(starClassName(star.spectral).ko).not.toBe('별')
  })
})
