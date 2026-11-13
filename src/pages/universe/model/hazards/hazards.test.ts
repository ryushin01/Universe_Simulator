import { dateToYear, yearToDate, yearToJd } from '@/shared/lib'
import {
  deflectionKm,
  escapeVelocityKms,
  impactOutcome,
  requiredMissKm,
} from './impact'
import { stormMitigation, stormTravelDays, STORM_CLASSES } from './storm'
import { BLAST_SOURCES, ozoneLoss, peakApparentMagnitude } from './stellar'
import {
  METEOR_SHOWERS,
  nextPeakYear,
  showerActivity,
  solarLongitude,
} from './meteors'
import { createNBody, relativeState, step, totalEnergy } from './nbody'
import { flybyGeometry, nbodyZone, tidalRadiusAu } from './flyby'
import { MU_SUN, elementsFromState, stateFromElements } from '../solar/kepler'

const source = (id: string) => BLAST_SOURCES.find((s) => s.id === id)!

describe('충돌', () => {
  it('지구 탈출 속도는 약 11.2km/s, 목성은 약 59km/s', () => {
    expect(escapeVelocityKms('earth')).toBeCloseTo(11.2, 1)
    expect(escapeVelocityKms('jupiter')).toBeCloseTo(59, 0)
  })

  it('첼랴빈스크급(20m)은 공중 폭발, 칙술루브급(10km)은 대멸종', () => {
    const chelyabinsk = impactOutcome('earth', 'stony', 20)
    expect(chelyabinsk.airburst).toBe(true)
    expect(chelyabinsk.energyMt).toBeGreaterThan(0.3)
    expect(chelyabinsk.energyMt).toBeLessThan(1)
    expect(chelyabinsk.severity).toBe(1)

    const chicxulub = impactOutcome('earth', 'stony', 10_000)
    expect(chicxulub.energyMt).toBeGreaterThan(5e7)
    expect(chicxulub.craterKm).toBeGreaterThan(100)
    expect(chicxulub.craterKm).toBeLessThan(250)
    expect(chicxulub.severity).toBe(7)
    expect(chicxulub.coolingC).toBeLessThan(-7)
  })

  it('가스 행성에는 크레이터 대신 대기 흔적이 남는다', () => {
    const sl9 = impactOutcome('jupiter', 'comet', 1000)
    expect(sl9.craterKm).toBeNull()
    expect(sl9.scarKm).toBeGreaterThan(1000)
  })

  it('340m 소행성은 5.5년 전에 운동 충돌체 7기로 비껴 가게 할 수 있다', () => {
    const need = requiredMissKm('earth', 'stony')
    expect(need).toBeGreaterThan(7500)
    expect(need).toBeLessThan(8500)
    const impactor = { kind: 'stony' as const, diameterM: 340 }
    expect(deflectionKm('kinetic', 7, impactor, 5.5)).toBeGreaterThan(need)
    expect(deflectionKm('kinetic', 7, impactor, 0.5)).toBeLessThan(need)
  })

  it('중력 견인선은 수십 년이 있어야 쓸모가 있다', () => {
    const impactor = { kind: 'stony' as const, diameterM: 340 }
    const need = requiredMissKm('earth', 'stony')
    expect(deflectionKm('tractor', 1, impactor, 5)).toBeLessThan(need)
    expect(deflectionKm('tractor', 1, impactor, 30)).toBeGreaterThan(need)
  })
})

describe('태양 폭풍', () => {
  it('캐링턴급 CME는 약 17시간 만에 지구에 닿는다', () => {
    const hours = stormTravelDays(STORM_CLASSES.carrington.speedKms, 1) * 24
    expect(hours).toBeGreaterThan(15)
    expect(hours).toBeLessThan(19)
  })

  it('경보 위성과 전력망 보호를 함께 쓰면 피해의 90%를 막는다', () => {
    expect(stormMitigation(false, false)).toBe(0)
    expect(stormMitigation(true, false)).toBeCloseTo(0.5)
    expect(stormMitigation(true, true)).toBeCloseTo(0.9)
  })
})

describe('별 폭발', () => {
  it('베텔게우스 초신성은 반달보다 밝지만 오존층에는 거의 영향이 없다', () => {
    const magnitude = peakApparentMagnitude(source('betelgeuse'))!
    expect(magnitude).toBeLessThan(-9)
    expect(magnitude).toBeGreaterThan(-12.7)
    expect(ozoneLoss(source('betelgeuse'))).toBeLessThan(0.02)
  })

  it('25광년 초신성은 오존층 절반가량을 없앤다', () => {
    const loss = ozoneLoss(source('near-25'))
    expect(loss).toBeGreaterThan(0.4)
    expect(loss).toBeLessThan(0.6)
  })

  it('6,500광년 감마선 폭발은 오존층 약 3분의 1을 없앤다', () => {
    expect(ozoneLoss(source('grb-6500'))).toBeCloseTo(0.35, 2)
  })
})

describe('유성우', () => {
  it('2026년 사자자리 유성우 극대는 11월 17일 무렵', () => {
    const leonids = METEOR_SHOWERS.find((s) => s.id === 'leonids')!
    const peak = yearToDate(
      nextPeakYear(leonids, dateToYear(new Date('2026-11-13T00:00:00Z'))),
    )!
    expect(peak.getUTCMonth()).toBe(10)
    expect(Math.abs(peak.getUTCDate() - 17)).toBeLessThanOrEqual(1)
  })

  it('페르세우스자리 유성우는 8월 12~13일 무렵이고 극대에서 가장 활발하다', () => {
    const perseids = METEOR_SHOWERS.find((s) => s.id === 'perseids')!
    const year = nextPeakYear(perseids, 2027)
    const peak = yearToDate(year)!
    expect(peak.getUTCMonth()).toBe(7)
    expect([11, 12, 13, 14]).toContain(peak.getUTCDate())
    const atPeak = showerActivity(perseids, solarLongitude(year))
    expect(atPeak).toBeCloseTo(100, 0)
    expect(
      showerActivity(perseids, solarLongitude(year + 10 / 365.25)),
    ).toBeLessThan(5)
  })

  it('극대 시각은 반복해서 구해도 하루 안에서 같다', () => {
    const geminids = METEOR_SHOWERS.find((s) => s.id === 'geminids')!
    const a = nextPeakYear(geminids, 2030)
    const b = nextPeakYear(geminids, a - 0.01)
    expect(Math.abs(yearToJd(a) - yearToJd(b))).toBeLessThan(1)
  })
})

describe('N체 계산', () => {
  it('원 궤도 행성은 100바퀴를 돌아도 에너지와 궤도가 유지된다', () => {
    const { r, v } = stateFromElements({
      a: 1,
      e: 0,
      i: 0,
      node: 0,
      argPeri: 0,
      meanAnomaly: 0,
    })
    const nb = createNBody(
      [
        { id: 'sun', mu: MU_SUN, r: [0, 0, 0], v: [0, 0, 0] },
        { id: 'earth', mu: MU_SUN * 3e-6, r, v },
      ],
      0,
    )
    const e0 = totalEnergy(nb)
    for (let k = 0; k < 365 * 100; k++) step(nb, 1)
    expect(Math.abs((totalEnergy(nb) - e0) / e0)).toBeLessThan(1e-6)
    const rel = relativeState(nb, 1, 0)
    expect(elementsFromState(rel.r, rel.v).a).toBeCloseTo(1, 4)
  })

  it('태양 같은 별이 40AU를 지나가면 해왕성이 지구보다 크게 흔들린다', () => {
    const planets = [
      { id: 'earth', a: 1, mu: MU_SUN * 3e-6 },
      { id: 'neptune', a: 30.07, mu: MU_SUN * 5.15e-5 },
    ]
    const zone = nbodyZone(40)!
    const { bVec, vHat } = flybyGeometry(40, 10, 0)
    const speed = 20 * (86_400 / 149_597_870.7)
    const startDist = Math.sqrt((zone * 1.05) ** 2 - 40 ** 2)
    const bodies = [
      {
        id: 'sun',
        mu: MU_SUN,
        r: [0, 0, 0] as [number, number, number],
        v: [0, 0, 0] as [number, number, number],
      },
      ...planets.map((p) => ({
        id: p.id,
        mu: p.mu,
        ...stateFromElements({
          a: p.a,
          e: 0,
          i: 0,
          node: 0,
          argPeri: 0,
          meanAnomaly: 90,
        }),
      })),
      {
        id: 'intruder',
        mu: MU_SUN,
        r: [
          bVec[0] - vHat[0] * startDist,
          bVec[1] - vHat[1] * startDist,
          bVec[2] - vHat[2] * startDist,
        ] as [number, number, number],
        v: [vHat[0] * speed, vHat[1] * speed, vHat[2] * speed] as [
          number,
          number,
          number,
        ],
      },
    ]
    const nb = createNBody(bodies, 0)
    const days = (2 * startDist) / speed
    for (let t = 0; t < days; t += 2) step(nb, 2)
    const ecc = (id: string) => {
      const rel = relativeState(nb, nb.ids.indexOf(id), 0)
      return elementsFromState(rel.r, rel.v).e
    }
    expect(ecc('neptune')).toBeGreaterThan(ecc('earth'))
    expect(ecc('neptune')).toBeGreaterThan(0.01)
  })

  it('항성 블랙홀(10배)은 지구를 약 0.006AU 안에서 찢는다', () => {
    expect(tidalRadiusAu(6371, 1, 10)).toBeGreaterThan(0.005)
    expect(tidalRadiusAu(6371, 1, 10)).toBeLessThan(0.008)
  })
})
