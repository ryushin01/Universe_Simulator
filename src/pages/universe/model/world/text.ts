import type { Locale, Text } from '@/shared/i18n'
import {
  formatBig,
  formatNumber,
  formatSig,
  formatYears,
  yearToDate,
} from '@/shared/lib'
import { BODIES } from '../solar/bodies'
import type { BodyId } from '../solar/bodies'
import { NOW_YEAR } from '../solar/sun'

export const nameOf = (id: BodyId, locale: Locale) => BODIES[id].name[locale]

/** 조사 (을/를, 이/가, 은/는, 와/과)를 받침에 맞게 */
export function josa(
  word: string,
  pair: '을를' | '이가' | '은는' | '와과',
): string {
  const last = word.charCodeAt(word.length - 1)
  const hangul = last >= 0xac00 && last <= 0xd7a3
  const batchim = hangul
    ? (last - 0xac00) % 28 !== 0
    : /[0-9LMNR]$/i.test(word) && !/[0-9]$/.test(word)
  return word + (batchim ? pair[0] : pair[1])
}

const pad = (n: number) => String(n).padStart(2, '0')

/** 시뮬레이션 날짜: 달력으로 쓸 수 있으면 2026.11.13, 아니면 'N년 후' */
export function formatSimDate(
  year: number,
  locale: Locale,
  withTime = false,
): string {
  const date = yearToDate(year)
  if (date && year < 100_000) {
    const text = `${date.getUTCFullYear()}.${pad(date.getUTCMonth() + 1)}.${pad(date.getUTCDate())}`
    return withTime
      ? `${text} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
      : text
  }
  const ahead = year - NOW_YEAR
  return locale === 'ko'
    ? `${formatYears(ahead, locale)} 후`
    : `${formatYears(ahead, locale)} from now`
}

/** 남은 시간 (년 → 일·시간까지) */
export function formatDuration(years: number, locale: Locale): string {
  const days = years * 365.25
  if (days < 2) {
    const hours = Math.max(0, days * 24)
    return locale === 'ko'
      ? `${formatSig(hours, locale, 2)}시간`
      : `${formatSig(hours, locale, 2)} h`
  }
  if (years < 1)
    return locale === 'ko'
      ? `${formatNumber(days, locale)}일`
      : `${formatNumber(days, locale)} days`
  return formatYears(Number(years.toPrecision(3)), locale)
}

export function formatPeople(count: number, locale: Locale): string {
  const n = Math.round(count)
  return locale === 'ko'
    ? `${formatBig(n, locale)}명`
    : `${formatBig(n, locale)} people`
}

export function formatKm(km: number, locale: Locale): string {
  return `${km >= 100 ? formatBig(Math.round(km), locale) : formatSig(km, locale, 2)} km`
}

export function formatMt(mt: number, locale: Locale): string {
  return locale === 'ko'
    ? `${formatBig(mt, locale)}메가톤`
    : `${formatBig(mt, locale)} Mt`
}

export const pick = (text: Text, locale: Locale) => text[locale]
