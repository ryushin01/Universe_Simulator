import type { CollisionInfo } from '../../model/local/collisionInfo'
import type {
  ForwardedEvent,
  FromWorker,
  ToWorker,
  Viewport as ViewportSize,
} from '../scene/protocol'
import type { LabelPosition, RenderState } from '../scene/types'

export interface RenderCallbacks {
  onLabels: (labels: LabelPosition[]) => void
  onCollision: (info: CollisionInfo) => void
  onReady: () => void
  onError: (error: unknown) => void
}

/** 3D 엔진과 주고받는 쪽: 워커에서 돌든 메인 스레드에서 돌든 같은 모양 */
export interface RenderClient {
  /** worker: OffscreenCanvas 워커, main: 메인 스레드 (워커를 쓸 수 없을 때) */
  readonly mode: 'worker' | 'main'
  setState(state: RenderState): void
  resize(size: ViewportSize): void
  rotate(dTheta: number, dPhi: number): void
  zoom(factor: number): void
  /** 화면 좌표(−1~1)에 있는 천체 */
  pick(x: number, y: number): Promise<string | null>
  /** 워커의 OrbitControls에 입력을 넘김 (메인 스레드면 캔버스가 직접 받음) */
  forward(event: ForwardedEvent): void
  dispose(): void
}

/** 캔버스를 워커로 넘길 수 있는지 (OffscreenCanvas) */
export const canUseWorker = (canvas: HTMLCanvasElement) =>
  typeof Worker !== 'undefined' &&
  typeof canvas.transferControlToOffscreen === 'function'

/** 렌더링 워커를 띄우고 캔버스를 넘김 */
export function createWorkerClient(
  canvas: HTMLCanvasElement,
  size: ViewportSize,
  smallTextures: boolean,
  callbacks: RenderCallbacks,
): RenderClient {
  const worker = new Worker(
    new URL('../scene/render.worker.ts', import.meta.url),
    { type: 'module' },
  )
  const send = (message: ToWorker, transfer: Transferable[] = []) =>
    worker.postMessage(message, transfer)
  let seq = 0
  const pending = new Map<number, (id: string | null) => void>()
  worker.onmessage = (event: MessageEvent<FromWorker>) => {
    const message = event.data
    switch (message.type) {
      case 'ready':
        callbacks.onReady()
        break
      case 'error':
        callbacks.onError(new Error(message.message))
        break
      case 'labels':
        callbacks.onLabels(message.labels)
        break
      case 'collision':
        callbacks.onCollision(message.info)
        break
      case 'picked':
        pending.get(message.seq)?.(message.id)
        pending.delete(message.seq)
        break
    }
  }
  // 모듈 워커를 못 읽는 브라우저 등: 메인 스레드로 바꿀 수 있게 알림
  worker.onerror = (event) => {
    event.preventDefault()
    callbacks.onError(event)
  }
  const offscreen = canvas.transferControlToOffscreen()
  send({ type: 'init', canvas: offscreen, smallTextures, ...size }, [offscreen])
  return {
    mode: 'worker',
    setState: (state) => send({ type: 'state', state }),
    resize: (next) => send({ type: 'resize', ...next }),
    rotate: (dTheta, dPhi) => send({ type: 'rotate', dTheta, dPhi }),
    zoom: (factor) => send({ type: 'zoom', factor }),
    pick: (x, y) =>
      new Promise((resolve) => {
        seq += 1
        pending.set(seq, resolve)
        send({ type: 'pick', x, y, seq })
      }),
    forward: (event) => send({ type: 'input', event }),
    dispose: () => {
      worker.terminate()
      for (const resolve of pending.values()) resolve(null)
      pending.clear()
    },
  }
}

/** 워커를 쓸 수 없을 때: 같은 엔진을 메인 스레드에서 */
export async function createMainClient(
  canvas: HTMLCanvasElement,
  size: ViewportSize,
  smallTextures: boolean,
  callbacks: RenderCallbacks,
): Promise<RenderClient> {
  const { Engine } = await import('../scene/Engine')
  const engine = new Engine({
    canvas,
    input: canvas,
    width: size.width,
    height: size.height,
    pixelRatio: size.pixelRatio,
    smallTextures,
    ...callbacks,
  })
  return {
    mode: 'main',
    setState: (state) => engine.setState(state),
    resize: (next) => engine.resize(next.width, next.height, next.pixelRatio),
    rotate: (dTheta, dPhi) => engine.rotate(dTheta, dPhi),
    zoom: (factor) => engine.zoom(factor),
    pick: (x, y) => Promise.resolve(engine.pick(x, y)),
    forward: () => {},
    dispose: () => engine.dispose(),
  }
}
