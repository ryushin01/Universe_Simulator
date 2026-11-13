import { AGE_NOW, ageAt, growth, redshift, scaleFactor } from './cosmology'

describe('ΛCDM 우주', () => {
  it('오늘 우주 나이는 약 138억 년', () => {
    expect(AGE_NOW).toBeGreaterThan(13.6)
    expect(AGE_NOW).toBeLessThan(14)
    expect(scaleFactor(AGE_NOW)).toBeCloseTo(1, 6)
  })

  it('나이와 척도 인자를 서로 바꾸고, 적색편이 1은 약 59억 년', () => {
    expect(ageAt(scaleFactor(5))).toBeCloseTo(5, 6)
    const t = ageAt(0.5)
    expect(redshift(0.5)).toBeCloseTo(1, 6)
    expect(t).toBeGreaterThan(5.5)
    expect(t).toBeLessThan(6.3)
  })

  it('구조는 시간이 갈수록 자라지만 암흑 에너지 때문에 미래에는 거의 멈춘다', () => {
    expect(growth(1)).toBeCloseTo(1, 6)
    expect(growth(0.5)).toBeLessThan(0.65)
    const late =
      growth(scaleFactor(AGE_NOW + 50)) - growth(scaleFactor(AGE_NOW + 40))
    const early = growth(scaleFactor(6)) - growth(scaleFactor(5))
    expect(late).toBeLessThan(early / 5)
    // 미래에도 줄어들지 않고 일정한 값에 다가감
    expect(late).toBeGreaterThanOrEqual(0)
    const future = growth(scaleFactor(AGE_NOW + 100))
    expect(future).toBeGreaterThan(growth(1))
    expect(future).toBeLessThan(1.5)
  })

  it('초기에는 성장 인자가 척도 인자에 비례한다 (물질 지배)', () => {
    expect(growth(0.01) / growth(0.02)).toBeCloseTo(0.5, 2)
  })
})
