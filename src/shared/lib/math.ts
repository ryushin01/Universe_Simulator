export const DEG = Math.PI / 180

export type Vec3 = [number, number, number]

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

/** 0 ≤ 각 < 360 */
export const wrapDeg = (deg: number) => ((deg % 360) + 360) % 360

/** −180 < 각 ≤ 180 */
export function wrap180(deg: number): number {
  const w = wrapDeg(deg)
  return w > 180 ? w - 360 : w
}

export const add = (a: Vec3, b: Vec3): Vec3 => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
]
export const sub = (a: Vec3, b: Vec3): Vec3 => [
  a[0] - b[0],
  a[1] - b[1],
  a[2] - b[2],
]
export const scale = (a: Vec3, s: number): Vec3 => [
  a[0] * s,
  a[1] * s,
  a[2] * s,
]
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
export const length = (a: Vec3) => Math.hypot(a[0], a[1], a[2])
export function normalize(a: Vec3): Vec3 {
  const l = length(a)
  return l === 0 ? [0, 0, 0] : [a[0] / l, a[1] / l, a[2] / l]
}
export const distance = (a: Vec3, b: Vec3) => length(sub(a, b))

/** 표의 [x, y] 점 사이를 보간 (log: y를 로그 공간에서 보간) */
export function interpolate(
  table: ReadonlyArray<readonly [number, number]>,
  x: number,
  mode: 'linear' | 'log' = 'linear',
): number {
  if (x <= table[0][0]) return table[0][1]
  const last = table[table.length - 1]
  if (x >= last[0]) return last[1]
  let i = 1
  while (table[i][0] < x) i++
  const [x0, y0] = table[i - 1]
  const [x1, y1] = table[i]
  const t = (x - x0) / (x1 - x0)
  return mode === 'log'
    ? Math.exp(lerp(Math.log(y0), Math.log(y1), t))
    : lerp(y0, y1, t)
}

/** 시드가 같으면 같은 수열을 내는 난수 (0 ≤ r < 1) */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 정규 분포 난수 (Box–Muller) */
export function gaussian(random: () => number): number {
  const u = Math.max(random(), 1e-12)
  const v = random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/** 적경·적위(도)와 거리를 적도 좌표계 직교 좌표로 */
export function sphericalToCartesian(
  raDeg: number,
  decDeg: number,
  dist = 1,
): Vec3 {
  const ra = raDeg * DEG
  const dec = decDeg * DEG
  return [
    dist * Math.cos(dec) * Math.cos(ra),
    dist * Math.cos(dec) * Math.sin(ra),
    dist * Math.sin(dec),
  ]
}

/** 황도 경사 (J2000) */
export const OBLIQUITY = 23.4392911 * DEG

/** 적도 좌표(ICRF) → 황도 좌표 */
export function equatorialToEcliptic([x, y, z]: Vec3): Vec3 {
  const c = Math.cos(OBLIQUITY)
  const s = Math.sin(OBLIQUITY)
  return [x, c * y + s * z, -s * y + c * z]
}

/**
 * 황도 좌표(x: 춘분점, z: 황도 북극) → three.js 장면 좌표(y가 위).
 * (x, y, z) → (x, z, −y) 는 오른손 좌표계를 유지하는 회전입니다.
 */
export const eclipticToScene = ([x, y, z]: Vec3): Vec3 => [x, z, -y]

/** ICRS(적도) → 은하 좌표 회전 행렬 (J2000) */
const GALACTIC_MATRIX = [
  [-0.0548755604, -0.8734370902, -0.4838350155],
  [0.4941094279, -0.44482963, 0.7469822445],
  [-0.867666149, -0.1980763734, 0.4559837762],
] as const

/** 적도 좌표 단위 벡터 → 은하 좌표 (x: 은하 중심 방향, z: 은하 북극) */
export function equatorialToGalactic([x, y, z]: Vec3): Vec3 {
  const m = GALACTIC_MATRIX
  return [
    m[0][0] * x + m[0][1] * y + m[0][2] * z,
    m[1][0] * x + m[1][1] * y + m[1][2] * z,
    m[2][0] * x + m[2][1] * y + m[2][2] * z,
  ]
}

/** 적경·적위(도)를 은하 경도·위도(도)로 */
export function galacticLonLat(
  raDeg: number,
  decDeg: number,
): { l: number; b: number } {
  const [x, y, z] = equatorialToGalactic(sphericalToCartesian(raDeg, decDeg))
  return {
    l: wrapDeg(Math.atan2(y, x) / DEG),
    b: Math.asin(clamp(z, -1, 1)) / DEG,
  }
}
