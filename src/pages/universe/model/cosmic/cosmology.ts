/**
 * 평탄한 ΛCDM 우주 (Planck 2018에 가까운 값, 복사는 무시).
 * 시간은 십억 년(Gyr), 거리는 백만 광년(Mly).
 */
export const H0 = 67.7
export const OMEGA_M = 0.31
export const OMEGA_L = 0.69
/** 허블 시간 1/H₀ (Gyr) */
export const HUBBLE_TIME = 977.8 / H0

/** 나이 t(Gyr)일 때 척도 인자 a (오늘 = 1) */
export function scaleFactor(tGyr: number): number {
  const x = 1.5 * Math.sqrt(OMEGA_L) * (tGyr / HUBBLE_TIME)
  return (OMEGA_M / OMEGA_L) ** (1 / 3) * Math.sinh(x) ** (2 / 3)
}

/** 척도 인자 a일 때 우주 나이 (Gyr) */
export function ageAt(a: number): number {
  return (
    (2 / (3 * Math.sqrt(OMEGA_L))) *
    HUBBLE_TIME *
    Math.asinh(Math.sqrt(OMEGA_L / OMEGA_M) * a ** 1.5)
  )
}

/** 오늘의 우주 나이 (약 138억 년) */
export const AGE_NOW = ageAt(1)

export const redshift = (a: number) => 1 / a - 1

/** 선형 성장 인자 (Carroll, Press & Turner 1992 근사), 오늘 = 1 */
function growthRaw(a: number): number {
  const om = OMEGA_M / a ** 3 / (OMEGA_M / a ** 3 + OMEGA_L)
  const ol = 1 - om
  const g = (2.5 * om) / (om ** (4 / 7) - ol + (1 + om / 2) * (1 + ol / 70))
  return a * g
}
const GROWTH_NOW = growthRaw(1)
export const growth = (a: number) => growthRaw(a) / GROWTH_NOW

/** 시뮬레이션 연도 → 우주 나이 (Gyr) */
export const cosmicAgeAtYear = (year: number) => AGE_NOW + (year - 2026) / 1e9
