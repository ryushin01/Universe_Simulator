import {
  dateToYear,
  distance,
  length,
  sub,
  wrap180,
  yearToJd,
} from '@/shared/lib'
import type { Vec3 } from '@/shared/lib'
import {
  eclipticLongitude,
  heliocentricPosition,
  satelliteOffsetKm,
  secularElements,
} from './ephemeris'
import { BODIES } from './bodies'
import { elementsFromState, stateFromElements } from './kepler'

const jdOf = (iso: string) => yearToJd(dateToYear(new Date(iso)))
const pos = (id: Parameters<typeof heliocentricPosition>[0], iso: string) =>
  heliocentricPosition(id, jdOf(iso)) as Vec3

describe('행성 위치 (JPL 근사 궤도 요소)', () => {
  it('J2000의 지구는 근일점 근처, 황경 약 100°에 있다', () => {
    const earth = pos('earth', '2000-01-01T12:00:00Z')
    expect(length(earth)).toBeCloseTo(0.9833, 3)
    expect(eclipticLongitude(earth)).toBeCloseTo(100.4, 0)
  })

  it.each([
    ['mars', '2025-01-16T00:00:00Z'],
    ['jupiter', '2026-01-10T00:00:00Z'],
    ['saturn', '2025-09-21T00:00:00Z'],
  ] as const)('%s 충(%s)에는 지구와 황경이 같다', (id, iso) => {
    const diff = wrap180(
      eclipticLongitude(pos(id, iso)) - eclipticLongitude(pos('earth', iso)),
    )
    expect(Math.abs(diff)).toBeLessThan(2)
  })

  it('수성은 근일점 0.307 AU, 원일점 0.467 AU 사이에 있다', () => {
    const el = secularElements(
      BODIES.mercury.orbit.type === 'secular'
        ? BODIES.mercury.orbit.row
        : (null as never),
      0.26,
    )
    expect(el.a * (1 - el.e)).toBeCloseTo(0.3075, 3)
    expect(el.a * (1 + el.e)).toBeCloseTo(0.4667, 3)
  })
})

describe('소천체', () => {
  it('아포피스는 2029년 4월 13일 지구 가까이를 지난다', () => {
    let closest = Infinity
    let when = 0
    const start = jdOf('2029-04-10T00:00:00Z')
    for (let k = 0; k < 24 * 7; k++) {
      const jd = start + k / 24
      const d = distance(
        heliocentricPosition('apophis', jd) as Vec3,
        heliocentricPosition('earth', jd) as Vec3,
      )
      if (d < closest) {
        closest = d
        when = jd
      }
    }
    // 실제 최근접: 약 3만 8천 km (0.00025 AU), 2029-04-13 21:46 UTC
    expect(closest).toBeLessThan(0.002)
    expect(Math.abs(when - jdOf('2029-04-13T21:46:00Z'))).toBeLessThan(1)
  })

  it('핼리 혜성은 2023년 말 원일점(약 35 AU), 2061년 7월 근일점(약 0.59 AU)', () => {
    expect(length(pos('halley', '2023-12-09T00:00:00Z'))).toBeGreaterThan(34.5)
    expect(length(pos('halley', '2061-07-28T00:00:00Z'))).toBeLessThan(0.62)
  })
})

describe('달', () => {
  it('2024년 1월 25일 보름달에는 달이 태양 반대편에 있다', () => {
    const jd = jdOf('2024-01-25T17:54:00Z')
    const earth = heliocentricPosition('earth', jd) as Vec3
    const moon = satelliteOffsetKm('moon', jd)
    // 지구에서 본 태양 방향은 −earth, 보름달이면 달은 +earth 쪽
    const elongation = wrap180(
      eclipticLongitude(moon) - eclipticLongitude(earth),
    )
    expect(Math.abs(elongation)).toBeLessThan(6)
    expect(length(moon)).toBeGreaterThan(356_000)
    expect(length(moon)).toBeLessThan(407_000)
  })
})

describe('궤도 요소 ↔ 위치·속도', () => {
  it('왕복 변환해도 같은 궤도 요소가 나온다', () => {
    const el = {
      a: 1.52,
      e: 0.093,
      i: 1.85,
      node: 49.6,
      argPeri: 286.5,
      meanAnomaly: 19.4,
    }
    const { r, v } = stateFromElements(el)
    const back = elementsFromState(r, v)
    expect(back.a).toBeCloseTo(el.a, 8)
    expect(back.e).toBeCloseTo(el.e, 8)
    expect(back.i).toBeCloseTo(el.i, 6)
    expect(back.node).toBeCloseTo(el.node, 6)
    expect(back.argPeri).toBeCloseTo(el.argPeri, 6)
    expect(back.meanAnomaly).toBeCloseTo(el.meanAnomaly, 6)
  })

  it('탈출 속도를 넘으면 묶이지 않은 궤도로 본다', () => {
    const r: Vec3 = [1, 0, 0]
    const v: Vec3 = [0, 0.03, 0] // 탈출 속도(0.0243 AU/일)보다 빠름
    expect(elementsFromState(r, v).e).toBeGreaterThanOrEqual(1)
    expect(length(sub(r, r))).toBe(0)
  })
})
