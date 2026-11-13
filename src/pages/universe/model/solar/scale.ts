import { eclipticToScene, length, scale } from '@/shared/lib'
import type { Vec3 } from '@/shared/lib'
import { BODIES } from './bodies'
import type { BodyId } from './bodies'

/**
 * 화면 거리 모드
 * - compressed: 태양과의 거리를 제곱근으로 줄여 해왕성까지 한 화면에 (기본)
 * - linear: 실제 거리 비율 (행성 크기는 보기 쉽게 키움)
 */
export type DistanceMode = 'compressed' | 'linear'

/** 1 AU를 화면 단위로 */
export const AU_UNITS = 10

export const sceneDistance = (rAu: number, mode: DistanceMode) =>
  mode === 'linear' ? rAu * AU_UNITS : AU_UNITS * Math.sqrt(rAu)

/** 태양 기준 위치(AU, 황도) → 장면 좌표 (방향은 그대로, 거리만 바꿈) */
export function toScene(positionAu: Vec3, mode: DistanceMode): Vec3 {
  const r = length(positionAu)
  if (r === 0) return [0, 0, 0]
  return eclipticToScene(scale(positionAu, sceneDistance(r, mode) / r))
}

const EARTH_RADIUS_KM = 6371

/** 행성·위성의 화면 반지름 (실제 반지름의 0.45제곱에 비례하게 키움) */
export function bodyVisualRadius(id: BodyId): number {
  const body = BODIES[id]
  if (body.kind === 'comet' || body.kind === 'asteroid') return 0.07
  return 0.42 * (body.radiusKm / EARTH_RADIUS_KM) ** 0.45
}

/** 태양 반지름 (AU) */
export const SUN_RADIUS_AU = 695_700 / 149_597_870.7

/**
 * 태양의 화면 반지름. 평소에는 보기 좋게 키우고,
 * 적색 거성처럼 커지면 궤도와 같은 비율로 그려 행성을 삼키는 모습이 맞게 보이게 함
 */
export function sunVisualRadius(radiusSun: number, mode: DistanceMode): number {
  const styled = (mode === 'linear' ? 1.1 : 2.3) * radiusSun ** 0.2
  return Math.max(styled, sceneDistance(radiusSun * SUN_RADIUS_AU, mode))
}

/**
 * 위성의 화면 거리: 모행성 화면 반지름 × (1 + 0.5·√(실제 거리 / 모행성 반지름))
 * (실제 비율이면 위성이 모행성에 너무 붙거나 멀어서)
 */
export function satelliteVisualDistance(
  offsetKm: number,
  parent: BodyId,
): number {
  const parentRadius = BODIES[parent].radiusKm
  return (
    bodyVisualRadius(parent) * (1 + 0.5 * Math.sqrt(offsetKm / parentRadius))
  )
}
