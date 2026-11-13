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

/**
 * 선형 성장 인자 (평탄 ΛCDM의 적분 해, Heath 1977), 오늘 = 1.
 * D(a) = (5Ωm/2)·E(a)·∫₀ᵃ da'/(a'E(a'))³, E(a) = √(Ωm a⁻³ + ΩΛ).
 * 초기에는 D ≈ a로 자라고, 암흑 에너지가 지배하는 먼 미래에는 일정한 값에 다가갑니다.
 * (Carroll·Press·Turner 근사식은 a가 커지면 오히려 줄어들어 미래에 쓸 수 없음)
 */
function growthRaw(a: number): number {
  // ∫ f da' = ∫ f·a' d(ln a'),  f = a'^1.5 / (Ωm + ΩΛ a'³)^1.5
  const lo = Math.log(1e-4)
  const hi = Math.log(a)
  const n = 400
  const h = (hi - lo) / n
  let sum = 0
  for (let k = 0; k <= n; k++) {
    const x = Math.exp(lo + k * h)
    const value = x ** 2.5 / (OMEGA_M + OMEGA_L * x ** 3) ** 1.5
    sum += value * (k === 0 || k === n ? 1 : k % 2 ? 4 : 2)
  }
  const integral = (sum * h) / 3
  const e = Math.sqrt(OMEGA_M / a ** 3 + OMEGA_L)
  return 2.5 * OMEGA_M * e * integral
}
const GROWTH_NOW = growthRaw(1)
export const growth = (a: number) => growthRaw(a) / GROWTH_NOW

/** 시뮬레이션 연도 → 우주 나이 (Gyr) */
export const cosmicAgeAtYear = (year: number) => AGE_NOW + (year - 2026) / 1e9
