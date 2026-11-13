export type FormatLocale = 'ko' | 'en'

const intlLocale = (locale: FormatLocale) =>
  locale === 'ko' ? 'ko-KR' : 'en-US'

/**
 * `toLocaleString(locale, options)`은 부를 때마다 서식기를 새로 만들어 느립니다.
 * 화면 숫자는 자주 바뀌므로 같은 설정의 서식기를 다시 씁니다.
 */
const formatters = new Map<string, Intl.NumberFormat>()

function formatter(
  locale: FormatLocale,
  key: string,
  options: Intl.NumberFormatOptions,
) {
  const id = `${locale}:${key}`
  let found = formatters.get(id)
  if (!found) {
    found = new Intl.NumberFormat(intlLocale(locale), options)
    formatters.set(id, found)
  }
  return found
}

export function formatNumber(
  value: number,
  locale: FormatLocale,
  fractionDigits = 0,
): string {
  return formatter(locale, `f${fractionDigits}`, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}

/** 유효 숫자 sig개 (천 단위 구분 포함) */
export function formatSig(
  value: number,
  locale: FormatLocale,
  sig = 3,
): string {
  if (value === 0 || !Number.isFinite(value)) return formatNumber(0, locale)
  return formatter(locale, `s${sig}`, {
    maximumSignificantDigits: sig,
  }).format(value)
}

const SUPERSCRIPT: Record<string, string> = {
  '-': '⁻',
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
}

/** 3.8×10²⁶ 꼴 */
export function formatPower(value: number, sig = 2): string {
  if (value === 0 || !Number.isFinite(value)) return '0'
  const exponent = Math.floor(Math.log10(Math.abs(value)))
  const mantissa = value / 10 ** exponent
  const sup = String(exponent)
    .split('')
    .map((c) => SUPERSCRIPT[c] ?? c)
    .join('')
  const m = Number(mantissa.toPrecision(sig))
  return m === 1 ? `10${sup}` : `${m}×10${sup}`
}

const KO_UNITS: Array<[number, string]> = [
  [1e16, '경'],
  [1e12, '조'],
  [1e8, '억'],
  [1e4, '만'],
]

const EN_UNITS: Array<[number, string]> = [
  [1e12, ' trillion'],
  [1e9, ' billion'],
  [1e6, ' million'],
]

/**
 * 큰 수를 읽기 쉬운 단위로: 한국어는 만·억·조·경, 영어는 million·billion·trillion.
 * 그보다 크면 10의 거듭제곱으로 씁니다.
 */
export function formatBig(
  value: number,
  locale: FormatLocale,
  sig = 3,
): string {
  const abs = Math.abs(value)
  if (!Number.isFinite(value)) return '—'
  const units = locale === 'ko' ? KO_UNITS : EN_UNITS
  const top = units[0][0]
  if (abs >= top * 10_000) return formatPower(value, sig)
  for (const [size, name] of units) {
    if (abs >= size) return `${formatSig(value / size, locale, sig)}${name}`
  }
  return formatSig(value, locale, abs >= 1000 ? 4 : sig)
}

/** 기간 (년) */
export function formatYears(years: number, locale: FormatLocale): string {
  const text = formatBig(years, locale)
  if (locale === 'ko') return `${text}년`
  return Math.abs(years) === 1 ? `${text} year` : `${text} years`
}

/** 금액 (십억 달러 단위 입력) */
export function formatMoney(billions: number, locale: FormatLocale): string {
  const abs = Math.abs(billions)
  const sign = billions < 0 ? '−' : ''
  if (abs >= 1e9) return `${sign}$${formatPower(abs * 1e9, 2)}`
  if (abs >= 1e6) return `${sign}$${formatSig(abs / 1e6, locale, 3)}P`
  if (abs >= 1e3) return `${sign}$${formatSig(abs / 1e3, locale, 3)}T`
  return `${sign}$${formatSig(abs, locale, abs >= 100 ? 3 : 2)}B`
}

/** 섭씨 온도 */
export function formatTemperature(celsius: number, locale: FormatLocale) {
  const rounded =
    Math.abs(celsius) >= 100
      ? Math.round(celsius / 10) * 10
      : Math.round(celsius)
  return `${rounded < 0 ? '−' : ''}${formatNumber(Math.abs(rounded), locale)}°C`
}

/** 부호를 붙인 수 (+1.2, −0.4) */
export function formatSigned(
  value: number,
  locale: FormatLocale,
  fractionDigits = 1,
): string {
  const text = formatNumber(Math.abs(value), locale, fractionDigits)
  if (Number(text.replace(/[^\d.]/g, '')) === 0) return text
  return value > 0 ? `+${text}` : value < 0 ? `−${text}` : text
}

/** 백분율 */
export function formatPercent(
  fraction: number,
  locale: FormatLocale,
  fractionDigits = 0,
): string {
  return `${formatNumber(fraction * 100, locale, fractionDigits)}%`
}
