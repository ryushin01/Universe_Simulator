/** J2000.0 (2000년 1월 1일 12시 TT)의 율리우스일 */
export const J2000_JD = 2451545.0
/** 율리우스년 일수 (천문 계산 기준) */
export const DAYS_PER_YEAR = 365.25
/** JS Date로 날짜를 나타낼 수 있는 대략의 한계 연도 */
export const MAX_CALENDAR_YEAR = 270_000

/**
 * 시뮬레이션 시간은 '소수 연도'로 다룹니다. 2000.0 = J2000.0, 1년 = 365.25일.
 * 몇십억 년 뒤까지 같은 값으로 표현합니다.
 */
export const yearToJd = (year: number) =>
  J2000_JD + (year - 2000) * DAYS_PER_YEAR

export const jdToYear = (jd: number) => 2000 + (jd - J2000_JD) / DAYS_PER_YEAR

/** J2000 이후 일수 */
export const daysSinceJ2000 = (year: number) => (year - 2000) * DAYS_PER_YEAR

/** J2000 이후 율리우스 세기 */
export const centuriesSinceJ2000 = (year: number) => (year - 2000) / 100

const UNIX_EPOCH_JD = 2440587.5

export const dateToYear = (date: Date) =>
  jdToYear(date.getTime() / 86_400_000 + UNIX_EPOCH_JD)

/** 날짜로 나타낼 수 있으면 Date, 아니면 null */
export function yearToDate(year: number): Date | null {
  if (!Number.isFinite(year) || Math.abs(year) > MAX_CALENDAR_YEAR) return null
  return new Date((yearToJd(year) - UNIX_EPOCH_JD) * 86_400_000)
}
