import { blackbodyColor, stageAt, sunAgeGyr, sunAt, yearAtSunAge } from './sun'
import {
  earthTemperature,
  habitability,
  habitableZone,
  insolation,
  livability,
  oceanLossPerGyr,
} from './climate'

describe('태양 진화', () => {
  it('오늘의 태양은 광도·반지름·질량이 1이고 표면 온도는 약 5,772K', () => {
    const now = sunAt(sunAgeGyr(2026))
    expect(now.luminosity).toBeCloseTo(1, 5)
    expect(now.radius).toBeCloseTo(1, 5)
    expect(now.mass).toBe(1)
    expect(now.temperature).toBeCloseTo(5772, 0)
    expect(now.stage).toBe('main')
  })

  it('10억 년 뒤에는 약 10% 밝아진다', () => {
    expect(sunAt(5.57).luminosity).toBeCloseTo(1.1, 2)
  })

  it('적색 거성 가지 끝에서는 반지름 약 1.2 AU, 광도 약 2,700배, 표면 약 2,600K', () => {
    const tip = sunAt(12.167)
    expect(tip.radius * 0.00465).toBeGreaterThan(1.1)
    expect(tip.luminosity).toBeGreaterThan(2500)
    expect(tip.temperature).toBeGreaterThan(2400)
    expect(tip.temperature).toBeLessThan(2900)
    expect(tip.mass).toBeCloseTo(0.668, 3)
  })

  it('단계는 주계열 → 준거성 → 적색 거성 → 수평 가지 → 점근 거성 → 행성상 성운 → 백색 왜성', () => {
    expect([5, 11, 12, 12.2, 12.3, 12.3655, 13].map(stageAt)).toEqual([
      'main',
      'subgiant',
      'redGiant',
      'horizontalBranch',
      'agb',
      'planetaryNebula',
      'whiteDwarf',
    ])
  })

  it('백색 왜성은 지구만 하고 시간이 지날수록 어두워진다', () => {
    const young = sunAt(13)
    const old = sunAt(18)
    expect(young.radius).toBeCloseTo(0.0125, 4)
    expect(old.luminosity).toBeLessThan(young.luminosity)
    expect(old.mass).toBe(0.54)
  })

  it('나이와 연도를 서로 바꾼다', () => {
    expect(yearAtSunAge(sunAgeGyr(1.29e6 + 2026))).toBeCloseTo(
      1.29e6 + 2026,
      -1,
    )
  })

  it('흑체 색: 차가운 별은 붉고 뜨거운 별은 푸르다', () => {
    const [r1, , b1] = blackbodyColor(3000)
    const [r2, , b2] = blackbodyColor(20000)
    expect(r1).toBeGreaterThan(b1)
    expect(b2).toBeGreaterThan(r2)
  })
})

describe('기후', () => {
  it('오늘 지구는 일사량 1, 기온 15°C, 거주 가능', () => {
    const s = insolation(1, 1.00000261, 0.01671123)
    expect(s).toBeCloseTo(1, 6)
    expect(earthTemperature(s)).toBeCloseTo(15, 6)
    expect(habitability(15, 1)).toBe('habitable')
    expect(livability(15, 1)).toBe(1)
  })

  it('차양은 받는 햇빛을 그 비율만큼 줄인다', () => {
    expect(insolation(1, 1.00000261, 0.01671123, 0.02)).toBeCloseTo(0.98, 6)
  })

  it('1.1배 햇빛에서는 바다가 줄기 시작하고 폭주 온실에서는 빠르게 사라진다', () => {
    const warm = earthTemperature(1.1)
    expect(oceanLossPerGyr(warm)).toBe(0)
    expect(oceanLossPerGyr(earthTemperature(1.15))).toBeGreaterThan(0)
    expect(oceanLossPerGyr(earthTemperature(1.4))).toBeGreaterThan(100)
    expect(habitability(earthTemperature(1.4), 0.5)).toBe('barren')
  })

  it('거주 가능 영역은 오늘 0.95~1.68 AU, 광도의 제곱근에 비례해 넓어진다', () => {
    const now = habitableZone(1)
    expect(now.inner).toBeCloseTo(0.95, 2)
    expect(now.outer).toBeCloseTo(1.676, 2)
    expect(habitableZone(4).inner).toBeCloseTo(2 * now.inner, 6)
  })
})
