import { DEG, cross, dot, length, wrap180 } from '@/shared/lib'
import type { Vec3 } from '@/shared/lib'

/** 가우스 중력 상수 k (AU^1.5 / 일 / 태양 질량^0.5) */
export const GAUSS_K = 0.01720209895
/** 태양 질량 1의 중력 변수 μ = k² (AU³/일²) */
export const MU_SUN = GAUSS_K * GAUSS_K

/** 궤도 요소: 긴반지름 a(AU), 이심률 e, 각은 모두 도(°), 황도 J2000 기준 */
export interface Elements {
  a: number
  e: number
  /** 궤도 경사 */
  i: number
  /** 승교점 경도 Ω */
  node: number
  /** 근일점 편각 ω */
  argPeri: number
  /** 평균 근점 이각 M */
  meanAnomaly: number
}

/** 케플러 방정식 M = E − e·sin E (라디안) */
export function solveKepler(meanAnomaly: number, e: number): number {
  const M = wrap180(meanAnomaly / DEG) * DEG
  let E = e < 0.8 ? M : Math.PI * Math.sign(M || 1)
  for (let k = 0; k < 50; k++) {
    const f = E - e * Math.sin(E) - M
    const step = f / (1 - e * Math.cos(E))
    E -= step
    if (Math.abs(step) < 1e-13) break
  }
  return E
}

/** 궤도면 좌표(x': 근일점 방향)를 황도 좌표로 돌리는 행렬의 두 열 */
function orbitalBasis(el: Elements): { p: Vec3; q: Vec3 } {
  const O = el.node * DEG
  const w = el.argPeri * DEG
  const I = el.i * DEG
  const cO = Math.cos(O)
  const sO = Math.sin(O)
  const cw = Math.cos(w)
  const sw = Math.sin(w)
  const cI = Math.cos(I)
  const sI = Math.sin(I)
  return {
    p: [cw * cO - sw * sO * cI, cw * sO + sw * cO * cI, sw * sI],
    q: [-sw * cO - cw * sO * cI, -sw * sO + cw * cO * cI, cw * sI],
  }
}

/** 태양(중심 천체) 기준 위치 (AU, 황도 J2000) */
export function positionFromElements(el: Elements): Vec3 {
  const E = solveKepler(el.meanAnomaly * DEG, el.e)
  const x = el.a * (Math.cos(E) - el.e)
  const y = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E)
  const { p, q } = orbitalBasis(el)
  return [p[0] * x + q[0] * y, p[1] * x + q[1] * y, p[2] * x + q[2] * y]
}

/** 위치(AU)와 속도(AU/일) */
export function stateFromElements(
  el: Elements,
  mu = MU_SUN,
): { r: Vec3; v: Vec3 } {
  const E = solveKepler(el.meanAnomaly * DEG, el.e)
  const cosE = Math.cos(E)
  const sinE = Math.sin(E)
  const b = Math.sqrt(1 - el.e * el.e)
  const n = Math.sqrt(mu / el.a ** 3)
  const x = el.a * (cosE - el.e)
  const y = el.a * b * sinE
  const k = (n * el.a) / (1 - el.e * cosE)
  const vx = -k * sinE
  const vy = k * b * cosE
  const { p, q } = orbitalBasis(el)
  return {
    r: [p[0] * x + q[0] * y, p[1] * x + q[1] * y, p[2] * x + q[2] * y],
    v: [p[0] * vx + q[0] * vy, p[1] * vx + q[1] * vy, p[2] * vx + q[2] * vy],
  }
}

/**
 * 위치·속도에서 궤도 요소를 구합니다.
 * 묶이지 않은 궤도(포물선·쌍곡선)면 e ≥ 1, a = Infinity를 돌려줍니다.
 */
export function elementsFromState(r: Vec3, v: Vec3, mu = MU_SUN): Elements {
  const rLen = length(r)
  const v2 = dot(v, v)
  const h = cross(r, v)
  const hLen = length(h)
  const energy = v2 / 2 - mu / rLen
  // 이심률 벡터
  const rv = dot(r, v)
  const eVec: Vec3 = [
    ((v2 - mu / rLen) * r[0] - rv * v[0]) / mu,
    ((v2 - mu / rLen) * r[1] - rv * v[1]) / mu,
    ((v2 - mu / rLen) * r[2] - rv * v[2]) / mu,
  ]
  const e = length(eVec)
  if (energy >= 0 || e >= 1) {
    return {
      a: Infinity,
      e: Math.max(e, 1),
      i: 0,
      node: 0,
      argPeri: 0,
      meanAnomaly: 0,
    }
  }
  const a = -mu / (2 * energy)
  const i = Math.acos(Math.max(-1, Math.min(1, h[2] / hLen)))
  const nodeVec: Vec3 = [-h[1], h[0], 0]
  const nLen = length(nodeVec)
  let node = nLen > 1e-12 ? Math.atan2(nodeVec[1], nodeVec[0]) : 0
  let argPeri: number
  let trueAnomaly: number
  if (nLen > 1e-12) {
    argPeri =
      e > 1e-10
        ? Math.acos(Math.max(-1, Math.min(1, dot(nodeVec, eVec) / (nLen * e))))
        : 0
    if (eVec[2] < 0) argPeri = 2 * Math.PI - argPeri
  } else {
    // 궤도면이 황도면과 같으면 근일점 경도를 편각으로 씀
    node = 0
    argPeri = e > 1e-10 ? Math.atan2(eVec[1], eVec[0]) : 0
    if (h[2] < 0) argPeri = 2 * Math.PI - argPeri
  }
  if (e > 1e-10) {
    trueAnomaly = Math.acos(
      Math.max(-1, Math.min(1, dot(eVec, r) / (e * rLen))),
    )
    if (rv < 0) trueAnomaly = 2 * Math.PI - trueAnomaly
  } else {
    // 원 궤도: 승교점(또는 x축)에서 잰 위치각
    const ref: Vec3 = nLen > 1e-12 ? nodeVec : [1, 0, 0]
    trueAnomaly = Math.acos(
      Math.max(-1, Math.min(1, dot(ref, r) / (length(ref) * rLen))),
    )
    if (dot(cross(ref, r), h) < 0) trueAnomaly = 2 * Math.PI - trueAnomaly
  }
  const E =
    2 *
    Math.atan2(
      Math.sqrt(1 - e) * Math.sin(trueAnomaly / 2),
      Math.sqrt(1 + e) * Math.cos(trueAnomaly / 2),
    )
  const M = E - e * Math.sin(E)
  return {
    a,
    e,
    i: i / DEG,
    node: node / DEG,
    argPeri: argPeri / DEG,
    meanAnomaly: wrap180(M / DEG),
  }
}

/** 평균 운동 (도/일) */
export const meanMotion = (a: number, mu = MU_SUN) =>
  Math.sqrt(mu / a ** 3) / DEG

/** 공전 주기 (일) */
export const orbitalPeriodDays = (a: number, mu = MU_SUN) =>
  (2 * Math.PI) / Math.sqrt(mu / a ** 3)

/** 궤도 한 바퀴를 이심 근점 이각으로 고르게 나눈 점들 (닫힌 선) */
export function orbitPoints(el: Elements, segments = 256): Vec3[] {
  const { p, q } = orbitalBasis(el)
  const b = Math.sqrt(1 - el.e * el.e)
  const points: Vec3[] = []
  for (let k = 0; k < segments; k++) {
    const E = (k / segments) * 2 * Math.PI
    const x = el.a * (Math.cos(E) - el.e)
    const y = el.a * b * Math.sin(E)
    points.push([p[0] * x + q[0] * y, p[1] * x + q[1] * y, p[2] * x + q[2] * y])
  }
  return points
}
