import { both } from '@/shared/i18n'
import type { Text } from '@/shared/i18n'
import { jdToYear, wrap180, wrapDeg, yearToJd } from '@/shared/lib'
import { eclipticLongitude, heliocentricPosition } from '../solar/ephemeris'
import type { Elements } from '../solar/kepler'

export interface MeteorShower {
  id: string
  name: Text
  /** 극대일의 태양 황경 λ☉ (도, J2000) */
  peakLongitude: number
  /** 극대 때 천정 시간당 유성 수 */
  zhr: number
  /** 활동 폭 (태양 황경, 도 ≈ 일) */
  width: number
  parent: Text
  /** 대기에 들어오는 속도 (km/s) */
  speedKms: number
  /** 복사점 (적경·적위, 도) */
  radiant: { ra: number; dec: number }
  /** 모천체 궤도 (먼지 띠를 그릴 때) */
  parentOrbit: Elements
}

const HALLEY: Elements = {
  a: 17.857,
  e: 0.96714,
  i: 162.19053,
  node: 59.098947,
  argPeri: 112.241431,
  meanAnomaly: 0,
}

export const METEOR_SHOWERS: MeteorShower[] = [
  {
    id: 'quadrantids',
    name: both('사분의자리 유성우', 'Quadrantids'),
    peakLongitude: 283.15,
    zhr: 110,
    width: 0.6,
    parent: both('소행성 2003 EH1', 'Asteroid 2003 EH1'),
    speedKms: 41,
    radiant: { ra: 230, dec: 49 },
    parentOrbit: {
      a: 3.122961,
      e: 0.6186585,
      i: 70.874655,
      node: 283.001218,
      argPeri: 171.338854,
      meanAnomaly: 0,
    },
  },
  {
    id: 'lyrids',
    name: both('거문고자리 유성우', 'Lyrids'),
    peakLongitude: 32.32,
    zhr: 18,
    width: 1,
    parent: both('대처 혜성 (C/1861 G1)', 'Comet Thatcher (C/1861 G1)'),
    speedKms: 49,
    radiant: { ra: 271, dec: 34 },
    parentOrbit: {
      a: 55.68,
      e: 0.983465,
      i: 79.7733,
      node: 31.8674,
      argPeri: 213.4496,
      meanAnomaly: 0,
    },
  },
  {
    id: 'eta-aquariids',
    name: both('물병자리 에타 유성우', 'Eta Aquariids'),
    peakLongitude: 45.5,
    zhr: 50,
    width: 4,
    parent: both('핼리 혜성', 'Halley’s Comet'),
    speedKms: 66,
    radiant: { ra: 338, dec: -1 },
    parentOrbit: HALLEY,
  },
  {
    id: 'perseids',
    name: both('페르세우스자리 유성우', 'Perseids'),
    peakLongitude: 140,
    zhr: 100,
    width: 2.5,
    parent: both('스위프트-터틀 혜성 (109P)', 'Comet Swift–Tuttle (109P)'),
    speedKms: 59,
    radiant: { ra: 48, dec: 58 },
    parentOrbit: {
      a: 26.09207,
      e: 0.9632258,
      i: 113.453817,
      node: 139.381192,
      argPeri: 152.982168,
      meanAnomaly: 0,
    },
  },
  {
    id: 'draconids',
    name: both('용자리 유성우', 'Draconids'),
    peakLongitude: 195.4,
    zhr: 10,
    width: 0.6,
    parent: both('자코비니-지너 혜성 (21P)', 'Comet Giacobini–Zinner (21P)'),
    speedKms: 20,
    radiant: { ra: 262, dec: 54 },
    parentOrbit: {
      a: 3.500303,
      e: 0.7104705,
      i: 32.002592,
      node: 195.40448,
      argPeri: 172.812482,
      meanAnomaly: 0,
    },
  },
  {
    id: 'orionids',
    name: both('오리온자리 유성우', 'Orionids'),
    peakLongitude: 208,
    zhr: 20,
    width: 3,
    parent: both('핼리 혜성', 'Halley’s Comet'),
    speedKms: 66,
    radiant: { ra: 95, dec: 16 },
    parentOrbit: HALLEY,
  },
  {
    id: 'leonids',
    name: both('사자자리 유성우', 'Leonids'),
    peakLongitude: 235.27,
    zhr: 15,
    width: 1.2,
    parent: both('템펠-터틀 혜성 (55P)', 'Comet Tempel–Tuttle (55P)'),
    speedKms: 71,
    radiant: { ra: 152, dec: 22 },
    parentOrbit: {
      a: 10.338338,
      e: 0.9055527,
      i: 162.486575,
      node: 235.270989,
      argPeri: 172.500274,
      meanAnomaly: 0,
    },
  },
  {
    id: 'geminids',
    name: both('쌍둥이자리 유성우', 'Geminids'),
    peakLongitude: 262.2,
    zhr: 150,
    width: 1.5,
    parent: both('소행성 파에톤 (3200)', 'Asteroid Phaethon (3200)'),
    speedKms: 35,
    radiant: { ra: 112, dec: 33 },
    parentOrbit: {
      a: 1.2714646,
      e: 0.8896723,
      i: 22.310527,
      node: 265.098806,
      argPeri: 322.300168,
      meanAnomaly: 0,
    },
  },
  {
    id: 'ursids',
    name: both('작은곰자리 유성우', 'Ursids'),
    peakLongitude: 270.7,
    zhr: 10,
    width: 0.8,
    parent: both('터틀 혜성 (8P)', 'Comet Tuttle (8P)'),
    speedKms: 33,
    radiant: { ra: 217, dec: 76 },
    parentOrbit: {
      a: 5.7002914,
      e: 0.8197876,
      i: 54.981969,
      node: 270.342162,
      argPeri: 207.511518,
      meanAnomaly: 0,
    },
  },
]

export const showerById = (id: string) =>
  METEOR_SHOWERS.find((s) => s.id === id)

/** 지구에서 본 태양 황경 λ☉ (도) */
export function solarLongitude(year: number): number {
  const earth = heliocentricPosition('earth', yearToJd(year))
  return earth ? wrapDeg(eclipticLongitude(earth) + 180) : 0
}

/** 지금의 활동도 (천정 시간당 유성 수) */
export function showerActivity(
  shower: MeteorShower,
  lambda: number,
  storm = 1,
): number {
  const d = wrap180(lambda - shower.peakLongitude) / shower.width
  return shower.zhr * storm * Math.exp(-d * d)
}

/** fromYear 이후 처음 오는 극대 시각 (소수 연도) */
export function nextPeakYear(shower: MeteorShower, fromYear: number): number {
  let year =
    fromYear +
    wrapDeg(shower.peakLongitude - solarLongitude(fromYear)) / 0.9856 / 365.25
  for (let k = 0; k < 4; k++) {
    const delta = wrap180(shower.peakLongitude - solarLongitude(year))
    year += delta / 0.9856 / 365.25
  }
  // 반올림 오차로 지난 극대가 나오면 1년 뒤
  return year < fromYear - 1e-6 ? nextPeakYear(shower, fromYear + 0.5) : year
}

/** 지금 가장 활발한 유성우 */
export function activeShower(
  year: number,
  storm?: { showerId: string; factor: number } | null,
): { shower: MeteorShower; zhr: number } | null {
  const lambda = solarLongitude(year)
  let best: { shower: MeteorShower; zhr: number } | null = null
  for (const shower of METEOR_SHOWERS) {
    const factor = storm && storm.showerId === shower.id ? storm.factor : 1
    const zhr = showerActivity(shower, lambda, factor)
    if (zhr >= 2 && (!best || zhr > best.zhr)) best = { shower, zhr }
  }
  return best
}

/** 유성 폭풍: 극대 앞뒤 하루 동안 활동도를 키움 (1966년 사자자리 유성우는 시간당 수만 개) */
export const METEOR_STORM_FACTOR = 200

export const peakJd = (shower: MeteorShower, fromYear: number) =>
  yearToJd(nextPeakYear(shower, fromYear))

export const yearOfJd = jdToYear
