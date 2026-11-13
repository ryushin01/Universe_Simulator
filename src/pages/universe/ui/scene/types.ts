import type { PerspectiveCamera, Raycaster, Scene, Vector3 } from 'three'
import type { ScaleId, Selection, ViewOptions } from '../../model/view'
import type { CollisionInfo } from '../../model/local/collisionInfo'
import type { WorldState } from '../../model/world/types'

export interface FrameContext {
  world: WorldState
  selected: string | null
  focus: string | null
  options: ViewOptions
  /** 우주 거대 구조를 볼 우주 나이 (십억 년, null이면 시뮬레이션 날짜를 따름) */
  cosmicAge: number | null
  camera: PerspectiveCamera
  /** 실제로 흐른 시간 (초) */
  elapsed: number
  dt: number
  reducedMotion: boolean
  pixelRatio: number
  /** 국부 은하군 장면이 계산한 두 은하의 상태를 정보 카드로 알림 */
  reportCollision: (info: CollisionInfo) => void
}

/** 장면을 만들 때 넘기는 환경 (워커에는 window가 없으므로 메인 스레드가 알려 줌) */
export interface SceneEnv {
  /** 화면이 좁거나 메모리가 적은 기기: 작은 텍스처 */
  smallTextures: boolean
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

/** 메인 스레드가 3D 엔진에 넘기는 화면 상태 (바뀔 때마다) */
export interface RenderState {
  /** 시뮬레이션 상태 (사건 기록은 빼고 넘김) */
  world: WorldState
  scale: ScaleId
  selection: Selection
  focus: string | null
  options: ViewOptions
  intro: boolean
  cosmicAge: number | null
  reducedMotion: boolean
  /** 이름표를 붙일 대상 (이름 보기를 끄면 빈 목록) */
  labelIds: string[]
}

/** 화면에 보이는 이름표의 위치 (캔버스 왼쪽 위 기준 CSS 픽셀) */
export interface LabelPosition {
  id: string
  x: number
  y: number
  /** 천체가 크게 보이면 이름을 한가운데에 */
  centered: boolean
}
