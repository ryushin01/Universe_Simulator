import { clamp, interpolate } from '@/shared/lib'

/** 오늘(2026년)의 태양 나이 (십억 년) */
export const SUN_AGE_NOW_GYR = 4.57
export const NOW_YEAR = 2026

export const sunAgeGyr = (year: number) =>
  SUN_AGE_NOW_GYR + (year - NOW_YEAR) / 1e9

export const yearAtSunAge = (ageGyr: number) =>
  NOW_YEAR + (ageGyr - SUN_AGE_NOW_GYR) * 1e9

/** 시뮬레이션이 끝나는 태양 나이 (백색 왜성이 식어 가는 중) */
export const MAX_SUN_AGE_GYR = 20
export const MAX_YEAR = yearAtSunAge(MAX_SUN_AGE_GYR)

export type SunStage =
  | 'main'
  | 'subgiant'
  | 'redGiant'
  | 'horizontalBranch'
  | 'agb'
  | 'planetaryNebula'
  | 'whiteDwarf'

/** 점근 거성 가지 끝 (행성상 성운이 시작되는 나이, 십억 년) */
const AGB_TIP_GYR = 12.365

/** 백색 왜성 냉각 (메스텔 냉각: L ∝ t^−1.4), 광도 L☉ */
const whiteDwarfLuminosity = (ageGyr: number) =>
  clamp(1e-3 * (ageGyr - AGB_TIP_GYR) ** -1.4, 2e-6, 100)

/**
 * 태양 진화 경로 [나이(십억 년), 광도(L☉), 반지름(R☉), 질량(M☉)].
 * Sackmann et al.(1993), Schröder & Smith(2008)의 값을 바탕으로 단순화했습니다.
 */
const TRACK: ReadonlyArray<readonly [number, number, number, number]> = [
  [0, 0.7, 0.89, 1],
  [1, 0.75, 0.9, 1],
  [2, 0.8, 0.92, 1],
  [3, 0.86, 0.95, 1],
  [4, 0.94, 0.98, 1],
  [4.57, 1, 1, 1],
  [5.57, 1.1, 1.04, 1],
  [6.57, 1.22, 1.09, 1],
  [7.57, 1.36, 1.15, 0.999],
  [8.57, 1.53, 1.23, 0.999],
  [9.57, 1.75, 1.35, 0.998],
  [10.4, 2, 1.48, 0.997],
  [10.9, 2.2, 1.6, 0.996],
  [11.4, 2.4, 1.9, 0.994],
  [11.6, 2.7, 2.3, 0.99],
  [11.8, 5, 4, 0.985],
  [11.95, 20, 10, 0.96],
  [12.05, 100, 30, 0.9],
  [12.12, 500, 90, 0.8],
  [12.15, 1200, 160, 0.72],
  [12.167, 2730, 256, 0.668],
  [12.1675, 41, 9.5, 0.668],
  [12.27, 44, 10.5, 0.668],
  [12.3, 110, 20, 0.66],
  [12.33, 500, 60, 0.63],
  [12.355, 2000, 120, 0.58],
  [AGB_TIP_GYR, 3000, 180, 0.54],
  [12.3651, 3500, 1, 0.54],
  [12.366, 1000, 0.05, 0.54],
  // 마지막 점은 냉각 곡선 위에 두어 표가 끝나는 곳에서 광도가 끊기지 않게 함
  [12.367, whiteDwarfLuminosity(12.367), 0.0125, 0.54],
]

/** 단계가 바뀌는 나이 (십억 년) */
export const STAGE_AGES = {
  subgiant: 10.9,
  redGiant: 11.6,
  heliumFlash: 12.167,
  agb: 12.27,
  agbTip: AGB_TIP_GYR,
  /** 행성상 성운은 실제로 수만 년이지만 보이도록 150만 년 동안 그림 */
  whiteDwarf: 12.3665,
} as const

export interface SunState {
  ageGyr: number
  /** 광도 (L☉) */
  luminosity: number
  /** 반지름 (R☉) */
  radius: number
  /** 질량 (M☉) */
  mass: number
  /** 표면 온도 (K) */
  temperature: number
  stage: SunStage
}

const column = (index: 1 | 2 | 3) =>
  TRACK.map((row) => [row[0], row[index]] as const)
const L_TRACK = column(1)
const R_TRACK = column(2)
const M_TRACK = column(3)

export function stageAt(ageGyr: number): SunStage {
  if (ageGyr < STAGE_AGES.subgiant) return 'main'
  if (ageGyr < STAGE_AGES.redGiant) return 'subgiant'
  if (ageGyr < STAGE_AGES.heliumFlash) return 'redGiant'
  if (ageGyr < STAGE_AGES.agb) return 'horizontalBranch'
  if (ageGyr < STAGE_AGES.agbTip) return 'agb'
  if (ageGyr < STAGE_AGES.whiteDwarf) return 'planetaryNebula'
  return 'whiteDwarf'
}

/** 나이에 따른 태양의 광도·반지름·질량·온도 */
export function sunAt(ageGyr: number): SunState {
  const last = TRACK[TRACK.length - 1][0]
  let luminosity: number
  let radius: number
  let mass: number
  if (ageGyr <= last) {
    luminosity = interpolate(L_TRACK, ageGyr, 'log')
    radius = interpolate(R_TRACK, ageGyr, 'log')
    mass = interpolate(M_TRACK, ageGyr)
  } else {
    luminosity = whiteDwarfLuminosity(ageGyr)
    radius = 0.0125
    mass = 0.54
  }
  const temperature = 5772 * (luminosity / radius ** 2) ** 0.25
  return {
    ageGyr,
    luminosity,
    radius,
    mass,
    temperature,
    stage: stageAt(ageGyr),
  }
}

/**
 * 흑체 색 근사 (Tanner Helland). 1,000K~40,000K → 0~1 RGB
 */
export function blackbodyColor(kelvin: number): [number, number, number] {
  const t = clamp(kelvin, 1000, 40000) / 100
  let r: number
  let g: number
  let b: number
  if (t <= 66) {
    r = 255
    g = 99.4708025861 * Math.log(t) - 161.1195681661
    b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307
  } else {
    r = 329.698727446 * (t - 60) ** -0.1332047592
    g = 288.1221695283 * (t - 60) ** -0.0755148492
    b = 255
  }
  return [
    clamp(r, 0, 255) / 255,
    clamp(g, 0, 255) / 255,
    clamp(b, 0, 255) / 255,
  ]
}

/** 지금부터 볼 만한 태양의 앞날 */
export const SUN_MILESTONES = [
  { id: 'now', ageGyr: SUN_AGE_NOW_GYR },
  { id: 'oceans', ageGyr: 5.6 },
  { id: 'msEnd', ageGyr: STAGE_AGES.subgiant },
  { id: 'redGiant', ageGyr: 12.0 },
  { id: 'tip', ageGyr: 12.1665 },
  { id: 'agb', ageGyr: 12.36 },
  { id: 'nebula', ageGyr: 12.3658 },
  { id: 'whiteDwarf', ageGyr: 13.5 },
] as const

export type SunMilestoneId = (typeof SUN_MILESTONES)[number]['id']
