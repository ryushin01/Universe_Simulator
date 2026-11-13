import type { PerspectiveCamera, Raycaster, Scene, Vector3 } from 'three'
import type { ScaleId, ViewOptions } from '../../model/view'
import type { WorldState } from '../../model/world/types'

export interface FrameContext {
  world: WorldState
  selected: string | null
  focus: string | null
  options: ViewOptions
  camera: PerspectiveCamera
  /** 실제로 흐른 시간 (초) */
  elapsed: number
  dt: number
  reducedMotion: boolean
  pixelRatio: number
}

export interface Target {
  position: Vector3
  /** 화면 반지름 (카메라 거리·이름표 위치 계산용) */
  radius: number
}

export interface Overview {
  target: Vector3
  distance: number
  /** 위에서 내려다보는 각 (라디안) */
  elevation: number
}

/** 규모마다 하나씩 만드는 3D 장면 */
export interface ScaleScene {
  id: ScaleId
  scene: Scene
  near: number
  far: number
  overview(): Overview
  target(id: string): Target | null
  /** 이름표를 그릴 위치 (안 보여야 하면 null) */
  labelAnchor(id: string, camera: PerspectiveCamera): Target | null
  pick(raycaster: Raycaster): string | null
  update(ctx: FrameContext): void
  dispose(): void
}
