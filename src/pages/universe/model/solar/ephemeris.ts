import {
  DEG,
  J2000_JD,
  clamp,
  cross,
  equatorialToEcliptic,
  normalize,
  scale,
  wrap180,
} from '@/shared/lib'
import type { Vec3 } from '@/shared/lib'
import { BODIES } from './bodies'
import type { BodyId, Pole, SecularRow } from './bodies'
import { MU_SUN, positionFromElements } from './kepler'
import type { Elements } from './kepler'

/** N체 계산 뒤 바뀐 궤도: 그때의 접촉 궤도 요소와 태양 질량 */
export interface OrbitOverride {
  elements: Elements
  epochJd: number
  sunMass: number
}

/**
 * JPL 근사 궤도 요소 (T: J2000 이후 율리우스 세기).
 * a·e·i의 변화율은 표의 유효 범위(1800~2050년) 밖에서 멈추고,
 * 평균 경도·근일점·승교점은 계속 돌게 둡니다.
 */
export function secularElements(row: SecularRow, T: number): Elements {
  const Tc = clamp(T, -2, 0.5)
  const a = row.a[0] + row.a[1] * Tc
  const e = row.e[0] + row.e[1] * Tc
  const i = row.i[0] + row.i[1] * Tc
  const L = row.L[0] + row.L[1] * T
  const peri = row.peri[0] + row.peri[1] * T
  const node = row.node[0] + row.node[1] * T
  return {
    a,
    e,
    i,
    node,
    argPeri: peri - node,
    meanAnomaly: wrap180(L - peri),
  }
}

/** 기준 시점의 접촉 궤도 요소를 jd로 옮깁니다 (2체 운동) */
export function propagate(
  el: Elements,
  epochJd: number,
  jd: number,
  mu = MU_SUN,
): Elements {
  const n = Math.sqrt(mu / el.a ** 3) / DEG
  return { ...el, meanAnomaly: wrap180(el.meanAnomaly + n * (jd - epochJd)) }
}

/** 태양 기준 궤도 요소 (위성·태양은 null) */
export function heliocentricElements(
  id: BodyId,
  jd: number,
  override?: OrbitOverride,
): Elements | null {
  if (override)
    return propagate(
      override.elements,
      override.epochJd,
      jd,
      MU_SUN * override.sunMass,
    )
  const orbit = BODIES[id].orbit
  switch (orbit.type) {
    case 'secular':
      return secularElements(orbit.row, (jd - J2000_JD) / 36525)
    case 'osculating':
      return propagate(orbit.elements, orbit.epochJd, jd)
    default:
      return null
  }
}

/**
 * 태양 기준 위치 (AU, 황도 J2000).
 * 태양이 질량을 잃으면 궤도가 그 비율만큼 넓어집니다 (a ∝ 1/M, 단열 근사).
 */
export function heliocentricPosition(
  id: BodyId,
  jd: number,
  sunMass = 1,
  override?: OrbitOverride,
): Vec3 | null {
  const el = heliocentricElements(id, jd, override)
  if (!el) return id === 'sun' ? [0, 0, 0] : null
  const expand = (override?.sunMass ?? 1) / sunMass
  return scale(positionFromElements(el), expand)
}

/** 모행성 기준 위성의 위치 (km, 황도 좌표) */
export function satelliteOffsetKm(id: BodyId, jd: number): Vec3 {
  const body = BODIES[id]
  const orbit = body.orbit
  const d = jd - J2000_JD
  if (orbit.type === 'moon') {
    const node = 125.08 - 0.0529538083 * d
    const peri = 83.353 + 0.1114040803 * d
    const L = 218.316 + 13.176396 * d
    return positionFromElements({
      a: 384_400,
      e: 0.0549,
      i: 5.145,
      node,
      argPeri: peri - node,
      meanAnomaly: wrap180(L - peri),
    })
  }
  if (orbit.type === 'satellite' && body.parent) {
    const pole = BODIES[body.parent].pole
    const theta =
      (orbit.l0 + (360 / orbit.periodDays) * (jd - orbit.epochJd)) * DEG
    const { x, y } = equatorAxes(pole)
    return [
      orbit.aKm * (Math.cos(theta) * x[0] + Math.sin(theta) * y[0]),
      orbit.aKm * (Math.cos(theta) * x[1] + Math.sin(theta) * y[1]),
      orbit.aKm * (Math.cos(theta) * x[2] + Math.sin(theta) * y[2]),
    ]
  }
  return [0, 0, 0]
}

/** 자전축의 적도면을 이루는 두 축과 북극 방향 (황도 좌표) */
export function equatorAxes(pole?: Pole): { x: Vec3; y: Vec3; z: Vec3 } {
  if (!pole) return { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }
  const ra = pole.ra * DEG
  const dec = pole.dec * DEG
  const p: Vec3 = [
    Math.cos(dec) * Math.cos(ra),
    Math.cos(dec) * Math.sin(ra),
    Math.sin(dec),
  ]
  // IAU 정의: 천체 적도가 ICRF 적도와 만나는 승교점은 적경 α + 90°
  const n: Vec3 = [-Math.sin(ra), Math.cos(ra), 0]
  const q = cross(p, n)
  return {
    x: equatorialToEcliptic(n),
    y: equatorialToEcliptic(q),
    z: equatorialToEcliptic(p),
  }
}

/**
 * 천체에 고정된 좌표축 (황도 좌표): x는 경도 0°(본초 자오선), y는 동경 90°, z는 북극.
 * 조석 고정 위성은 x축이 모행성을 향합니다.
 */
export function bodyAxes(
  id: BodyId,
  jd: number,
  towardParent?: Vec3,
): { x: Vec3; y: Vec3; z: Vec3 } {
  const body = BODIES[id]
  if (body.tidallyLocked && towardParent && body.parent) {
    const z = equatorAxes(BODIES[body.parent].pole).z
    const x = normalize(cross(cross(z, towardParent), z))
    return { x, y: cross(z, x), z }
  }
  const d = jd - J2000_JD
  if (!body.pole) {
    // 자전축 자료가 없으면 황도 북극을 축으로 돌림
    const w = (360 / body.rotationHours) * 24 * d * DEG
    return {
      x: [Math.cos(w), Math.sin(w), 0],
      y: [-Math.sin(w), Math.cos(w), 0],
      z: [0, 0, 1],
    }
  }
  const { x: n, y: q, z } = equatorAxes(body.pole)
  const w = (body.pole.w0 + body.pole.rate * d) * DEG
  const x: Vec3 = [
    Math.cos(w) * n[0] + Math.sin(w) * q[0],
    Math.cos(w) * n[1] + Math.sin(w) * q[1],
    Math.cos(w) * n[2] + Math.sin(w) * q[2],
  ]
  return { x, y: cross(z, x), z }
}

/** 황경 (도) */
export const eclipticLongitude = (p: Vec3) =>
  (((Math.atan2(p[1], p[0]) / DEG) % 360) + 360) % 360
