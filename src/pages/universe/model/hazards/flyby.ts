import { both } from '@/shared/i18n'
import type { Text } from '@/shared/i18n'
import { DEG } from '@/shared/lib'
import type { Vec3 } from '@/shared/lib'

export type IntruderKind =
  | 'redDwarf'
  | 'sunLike'
  | 'rogueJupiter'
  | 'stellarBlackHole'
  | 'primordialBlackHole'

export interface IntruderSpec {
  /** 기본 질량 (태양 질량) */
  massSun: number
  /** 실제 반지름 (km). 블랙홀은 사건의 지평선 */
  radiusKm: number
  color: string
  blackHole: boolean
  name: Text
}

export const INTRUDERS: Record<IntruderKind, IntruderSpec> = {
  redDwarf: {
    massSun: 0.3,
    radiusKm: 210_000,
    color: '#ff9a6b',
    blackHole: false,
    name: both('적색 왜성', 'Red dwarf'),
  },
  sunLike: {
    massSun: 1,
    radiusKm: 695_700,
    color: '#fff1c9',
    blackHole: false,
    name: both('태양 같은 별', 'Sun-like star'),
  },
  rogueJupiter: {
    massSun: 0.000954,
    radiusKm: 69_911,
    color: '#b9a07a',
    blackHole: false,
    name: both('떠돌이 행성 (목성 질량)', 'Rogue planet (Jupiter mass)'),
  },
  stellarBlackHole: {
    massSun: 10,
    radiusKm: 29.5,
    color: '#000000',
    blackHole: true,
    name: both('항성 블랙홀', 'Stellar black hole'),
  },
  primordialBlackHole: {
    massSun: 3e-5,
    radiusKm: 0.0001,
    color: '#000000',
    blackHole: true,
    name: both('원시 블랙홀', 'Primordial black hole'),
  },
}

export interface FlybyPreset {
  id: string
  kind: IntruderKind
  massSun: number
  /** 가장 가까울 때 태양과의 거리 (AU) */
  closestAu: number
  speedKms: number
  /** 실제 예측이면 가장 가까워질 때까지 남은 해 */
  leadYears?: number
  inclination: number
  longitude: number
  real: boolean
  name: Text
  note: Text
}

export const FLYBY_PRESETS: FlybyPreset[] = [
  {
    id: 'gliese710',
    kind: 'redDwarf',
    massSun: 0.6,
    closestAu: 10_700,
    speedKms: 14,
    leadYears: 1.29e6,
    inclination: 30,
    longitude: 120,
    real: true,
    name: both('글리제 710 (실제 예측)', 'Gliese 710 (predicted)'),
    note: both(
      '가이아 관측으로 약 129만 년 뒤 약 1만 AU까지 다가올 것으로 봅니다. 행성 궤도는 거의 그대로지만 오르트 구름을 흔들어 혜성 소나기를 부를 수 있습니다.',
      'Gaia data predict it will pass about 10,000 AU from the Sun in ~1.29 million years. Planetary orbits barely change, but the Oort cloud is stirred into a comet shower.',
    ),
  },
  {
    id: 'red-dwarf',
    kind: 'redDwarf',
    massSun: 0.3,
    closestAu: 200,
    speedKms: 25,
    inclination: 20,
    longitude: 200,
    real: false,
    name: both('적색 왜성 (200 AU)', 'Red dwarf (200 AU)'),
    note: both(
      '카이퍼 벨트를 흔들고 해왕성 궤도를 조금 바꿉니다.',
      'Stirs the Kuiper Belt and nudges Neptune’s orbit.',
    ),
  },
  {
    id: 'sun-like',
    kind: 'sunLike',
    massSun: 1,
    closestAu: 40,
    speedKms: 20,
    inclination: 15,
    longitude: 40,
    real: false,
    name: both('태양 같은 별 (40 AU)', 'Sun-like star (40 AU)'),
    note: both(
      '바깥 행성 궤도가 크게 흔들립니다.',
      'Badly scrambles the outer planets.',
    ),
  },
  {
    id: 'rogue-jupiter',
    kind: 'rogueJupiter',
    massSun: 0.000954,
    closestAu: 1.5,
    speedKms: 15,
    inclination: 5,
    longitude: 300,
    real: false,
    name: both('떠돌이 행성 (1.5 AU)', 'Rogue planet (1.5 AU)'),
    note: both(
      '별 없이 떠도는 행성은 별보다 많을지도 모릅니다. 안쪽 행성 궤도가 이심률을 얻습니다.',
      'Free-floating planets may outnumber stars. The inner planets’ orbits grow eccentric.',
    ),
  },
  {
    id: 'black-hole',
    kind: 'stellarBlackHole',
    massSun: 10,
    closestAu: 30,
    speedKms: 40,
    inclination: 25,
    longitude: 160,
    real: false,
    name: both('항성 블랙홀 (30 AU)', 'Stellar black hole (30 AU)'),
    note: both(
      '태양 10배 질량. 빛을 내지 않아 다가와도 보이지 않고, 별빛을 휘게 하는 중력 렌즈로만 알 수 있습니다.',
      'Ten solar masses. It emits no light — only the gravitational lensing of starlight gives it away.',
    ),
  },
  {
    id: 'pbh',
    kind: 'primordialBlackHole',
    massSun: 3e-5,
    closestAu: 1,
    speedKms: 30,
    inclination: 10,
    longitude: 80,
    real: false,
    name: both('원시 블랙홀 (지구 10배)', 'Primordial black hole (10 Earths)'),
    note: both(
      '빅뱅 직후 생겼을지 모르는 작은 블랙홀. 크기는 자몽만 하지만 지구 10배 질량입니다. 제9행성이 원시 블랙홀일 수 있다는 가설도 있습니다.',
      'A tiny black hole that may date from just after the Big Bang: grapefruit-sized yet ten Earth masses. Some suggest Planet Nine could be one.',
    ),
  },
]

export const AU_KM = 149_597_870.7
export const KMS_TO_AU_PER_DAY = 86_400 / AU_KM
export const KMS_TO_AU_PER_YEAR = KMS_TO_AU_PER_DAY * 365.25

/** 이보다 멀리 지나가면 행성 궤도 변화는 무시하고 혜성 소나기만 셈 */
export const NBODY_LIMIT_AU = 3000

/** N체 계산을 하는 거리 (AU). 너무 멀면 null */
export function nbodyZone(closestAu: number): number | null {
  if (closestAu > NBODY_LIMIT_AU) return null
  return Math.max(3 * closestAu, 150)
}

/**
 * 근접 통과 궤적: 가장 가까운 점 bVec와 진행 방향 vHat (황도 좌표).
 * longitude: 가장 가까운 점의 황경, inclination: 궤적이 황도면과 이루는 각
 */
export function flybyGeometry(
  closestAu: number,
  inclination: number,
  longitude: number,
): { bVec: Vec3; vHat: Vec3 } {
  const L = longitude * DEG
  const i = inclination * DEG
  return {
    bVec: [closestAu * Math.cos(L), closestAu * Math.sin(L), 0],
    vHat: [-Math.cos(i) * Math.sin(L), Math.cos(i) * Math.cos(L), Math.sin(i)],
  }
}

/** 직선 운동으로 본 침입 천체 위치 (AU) */
export function intruderPosition(
  bVec: Vec3,
  vHat: Vec3,
  speedKms: number,
  yearsFromClosest: number,
): Vec3 {
  const s = speedKms * KMS_TO_AU_PER_YEAR * yearsFromClosest
  return [bVec[0] + vHat[0] * s, bVec[1] + vHat[1] * s, bVec[2] + vHat[2] * s]
}

/** 가장 가까워질 때까지 걸리는 해 (N체 구역 경계에서 출발한다고 볼 때) */
export function approachYears(closestAu: number, speedKms: number): number {
  const zone = nbodyZone(closestAu) ?? closestAu * 3
  const start = zone * 1.05
  return (
    Math.sqrt(start * start - closestAu * closestAu) /
    (speedKms * KMS_TO_AU_PER_YEAR)
  )
}

const SUN_EARTH_MASS = 332_946

/** 블랙홀이 천체를 찢는 조석 반지름 (AU) */
export function tidalRadiusAu(
  bodyRadiusKm: number,
  bodyMassEarth: number,
  holeMassSun: number,
): number {
  return (
    (bodyRadiusKm * Math.cbrt((holeMassSun * SUN_EARTH_MASS) / bodyMassEarth)) /
    AU_KM
  )
}

/** 항성 엔진이 낼 수 있는 가속도 (m/s²): 슈카도프 추진기 약 10⁻¹² */
export const STELLAR_ENGINE_ACCEL = 1e-12

/** 남은 시간 동안 항성 엔진이 태양계를 옮기는 거리 (AU) */
export function stellarEngineShiftAu(years: number): number {
  const t = years * 3.15576e7
  return (0.5 * STELLAR_ENGINE_ACCEL * t * t) / (AU_KM * 1000)
}
