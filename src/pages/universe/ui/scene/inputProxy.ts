import type { ForwardedEvent, Rect } from './protocol'

type Listener = (event: ProxyEvent) => void

/** 대리 요소가 내보내는 이벤트 (DOM 이벤트처럼 막기 함수가 있음) */
export type ProxyEvent = ForwardedEvent & {
  target: InputProxy
  preventDefault: () => void
  stopPropagation: () => void
}

/**
 * 워커에는 DOM이 없으므로 OrbitControls가 실제 캔버스 대신 듣는 대리 요소.
 * 메인 스레드가 넘겨준 포인터·휠 입력을 같은 모양의 이벤트로 다시 내보냅니다.
 * (포인터 캡처·스크롤 막기·커서는 메인 스레드의 실제 캔버스가 맡음)
 */
export class InputProxy {
  /** OrbitControls가 커서·터치 동작을 적어 두는 곳 (워커에서는 쓰이지 않음) */
  readonly style: Record<string, string> = {}
  clientWidth = 0
  clientHeight = 0
  private rect: Rect = { left: 0, top: 0, width: 0, height: 0 }
  private listeners = new Map<string, Set<Listener>>()

  /** OrbitControls는 문서 전체에서 끌기를 이어 받으므로 문서도 자기 자신 */
  get ownerDocument(): InputProxy {
    return this
  }

  getRootNode(): InputProxy {
    return this
  }

  setRect(rect: Rect) {
    this.rect = rect
    this.clientWidth = rect.width
    this.clientHeight = rect.height
  }

  getBoundingClientRect() {
    const { left, top, width, height } = this.rect
    return {
      left,
      top,
      width,
      height,
      x: left,
      y: top,
      right: left + width,
      bottom: top + height,
    }
  }

  addEventListener(type: string, listener: Listener) {
    let set = this.listeners.get(type)
    if (!set) {
      set = new Set()
      this.listeners.set(type, set)
    }
    set.add(listener)
  }

  removeEventListener(type: string, listener: Listener) {
    this.listeners.get(type)?.delete(listener)
  }

  setPointerCapture() {}
  releasePointerCapture() {}
  hasPointerCapture() {
    return false
  }
  focus() {}

  /** 메인 스레드가 넘겨준 입력을 이벤트로 내보냄 */
  dispatch(data: ForwardedEvent) {
    const set = this.listeners.get(data.type)
    if (!set) return
    const event: ProxyEvent = {
      ...data,
      target: this,
      preventDefault() {},
      stopPropagation() {},
    }
    // 듣는 도중에 목록이 바뀌어도(끌기 시작·끝) 이번 이벤트는 처음 목록대로
    for (const listener of [...set]) listener.call(this, event)
  }
}
