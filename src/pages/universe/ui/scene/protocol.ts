import type { CollisionInfo } from '../../model/local/collisionInfo'
import type { LabelPosition, RenderState } from './types'

/** 캔버스의 화면 위치 (CSS 픽셀) */
export interface Rect {
  left: number
  top: number
  width: number
  height: number
}

/** 워커의 OrbitControls에 넘기는 포인터·휠 입력 (DOM 이벤트에서 필요한 값만) */
export interface ForwardedEvent {
  type: string
  pointerId?: number
  pointerType?: string
  isPrimary?: boolean
  button?: number
  buttons?: number
  clientX?: number
  clientY?: number
  pageX?: number
  pageY?: number
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  deltaX?: number
  deltaY?: number
  deltaZ?: number
  deltaMode?: number
}

export interface Viewport {
  width: number
  height: number
  pixelRatio: number
  rect: Rect
}

/** 메인 스레드 → 렌더링 워커 */
export type ToWorker =
  | ({
      type: 'init'
      canvas: OffscreenCanvas
      smallTextures: boolean
    } & Viewport)
  | { type: 'state'; state: RenderState }
  | ({ type: 'resize' } & Viewport)
  | { type: 'input'; event: ForwardedEvent }
  | { type: 'rotate'; dTheta: number; dPhi: number }
  | { type: 'zoom'; factor: number }
  | { type: 'pick'; x: number; y: number; seq: number }
  | { type: 'dispose' }

/** 렌더링 워커 → 메인 스레드 */
export type FromWorker =
  | { type: 'ready' }
  | { type: 'error'; message: string }
  | { type: 'labels'; labels: LabelPosition[] }
  | { type: 'collision'; info: CollisionInfo }
  | { type: 'picked'; id: string | null; seq: number }

/** DOM 포인터·휠 이벤트에서 OrbitControls가 쓰는 값만 골라 냄 */
export function forwardable(event: PointerEvent | WheelEvent): ForwardedEvent {
  const base: ForwardedEvent = {
    type: event.type,
    button: event.button,
    buttons: event.buttons,
    clientX: event.clientX,
    clientY: event.clientY,
    pageX: event.pageX,
    pageY: event.pageY,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    shiftKey: event.shiftKey,
    altKey: event.altKey,
  }
  if ('pointerId' in event) {
    base.pointerId = event.pointerId
    base.pointerType = event.pointerType
    base.isPrimary = event.isPrimary
  }
  if ('deltaY' in event) {
    base.deltaX = event.deltaX
    base.deltaY = event.deltaY
    base.deltaZ = event.deltaZ
    base.deltaMode = event.deltaMode
  }
  return base
}
