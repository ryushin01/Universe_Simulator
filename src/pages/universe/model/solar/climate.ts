import { clamp, interpolate } from '@/shared/lib'

/** 오늘 지구 궤도의 일사량 정규화 값 */
const EARTH_A = 1.00000261
const EARTH_E = 0.01671123
const S_NOW = 1 / (EARTH_A ** 2 * Math.sqrt(1 - EARTH_E ** 2))

/**
 * 받는 햇빛 (오늘 지구 = 1).
 * 궤도 평균: L / (a²·√(1−e²)), 차양이 가리는 비율만큼 줄임
 */
export function insolation(
  luminosity: number,
  a: number,
  e: number,
  shade = 0,
): number {
  if (!Number.isFinite(a) || a <= 0) return 0
  return (
    (luminosity / (a * a * Math.sqrt(Math.max(1e-6, 1 - e * e))) / S_NOW) *
    (1 - shade)
  )
}

/**
 * 일사량에 따른 지구 평균 기온 (°C, 단순화한 기후 모형).
 * 1.1배 무렵 습윤 온실 상태(바다가 우주로 빠져나감), 1.4배 무렵 폭주 온실,
 * 0.9배 아래로는 눈덩이 지구 쪽으로 기웁니다.
 */
const EARTH_TEMPERATURE: ReadonlyArray<readonly [number, number]> = [
  [0, -240],
  [0.1, -200],
  [0.3, -130],
  [0.5, -80],
  [0.7, -45],
  [0.8, -25],
  [0.9, -3],
  [0.95, 7],
  [1, 15],
  [1.05, 27],
  [1.1, 47],
  [1.15, 68],
  [1.2, 90],
  [1.3, 160],
  [1.4, 330],
  [1.6, 420],
  [2, 520],
  [4, 700],
  [10, 1000],
  [100, 1600],
  [1000, 2300],
  [10000, 3000],
]

export function earthTemperature(s: number): number {
  return interpolate(EARTH_TEMPERATURE, s)
}

/**
 * 지구 밖 천체는 온실 효과가 그대로라고 보고 복사 평형으로 비례:
 * T ∝ (받는 햇빛)^¼
 */
export function scaledTemperature(nowCelsius: number, sRatio: number): number {
  return (nowCelsius + 273.15) * Math.max(sRatio, 0) ** 0.25 - 273.15
}

/** 보수적 거주 가능 영역 (Kopparapu et al. 2013): 안쪽 S=1.107, 바깥쪽 S=0.356 */
export function habitableZone(luminosity: number): {
  inner: number
  outer: number
} {
  return {
    inner: Math.sqrt(luminosity / 1.107),
    outer: Math.sqrt(luminosity / 0.356),
  }
}

/** 바다가 줄어드는 속도 (1십억 년당 비율). 60°C부터 시작해 폭주 온실이면 빠르게 */
export function oceanLossPerGyr(celsius: number): number {
  if (celsius < 60) return 0
  if (celsius < 100) return (celsius - 60) / 40
  return 1 + (celsius - 100) ** 2 / 100
}

export type HabitabilityId =
  'frozen' | 'cold' | 'habitable' | 'hot' | 'boiling' | 'barren' | 'molten'

/** 기온·바다로 본 지구 상태 */
export function habitability(celsius: number, ocean: number): HabitabilityId {
  if (celsius > 1000) return 'molten'
  if (ocean <= 0.001 || celsius > 150) return 'barren'
  if (celsius > 60) return 'boiling'
  if (celsius > 35) return 'hot'
  if (celsius >= 5) return 'habitable'
  if (celsius >= -15) return 'cold'
  return 'frozen'
}

/** 사람이 살 수 있는 정도 (0~1): 5~35°C면 1, 60°C 이상·−30°C 이하면 0 */
export function livability(celsius: number, ocean: number): number {
  const heat = celsius <= 35 ? 1 : celsius >= 60 ? 0 : 1 - (celsius - 35) / 25
  const cold = celsius >= 5 ? 1 : celsius <= -30 ? 0 : 1 - (5 - celsius) / 35
  return clamp(Math.min(heat, cold) * clamp(ocean * 4, 0, 1), 0, 1)
}
