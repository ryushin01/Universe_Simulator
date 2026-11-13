/**
 * 렌더링 워커: three.js 엔진 전체(셰이더 컴파일, 장면 생성, 프레임마다 그리기)를
 * 메인 스레드 밖에서 돌려 화면 글자·버튼 조작이 3D 때문에 멈추지 않게 합니다.
 */
import { Engine } from './Engine'
import { InputProxy } from './inputProxy'
import type { FromWorker, ToWorker } from './protocol'

const scope = self as unknown as {
  postMessage: (message: FromWorker) => void
  onmessage: ((event: MessageEvent<ToWorker>) => void) | null
}

let engine: Engine | null = null
const input = new InputProxy()
const post = (message: FromWorker) => scope.postMessage(message)

scope.onmessage = (event) => {
  const message = event.data
  switch (message.type) {
    case 'init':
      try {
        input.setRect(message.rect)
        engine = new Engine({
          canvas: message.canvas,
          input: input as unknown as HTMLElement,
          width: message.width,
          height: message.height,
          pixelRatio: message.pixelRatio,
          smallTextures: message.smallTextures,
          onLabels: (labels) => post({ type: 'labels', labels }),
          onCollision: (info) => post({ type: 'collision', info }),
          onReady: () => post({ type: 'ready' }),
          onError: (error) => post({ type: 'error', message: String(error) }),
        })
      } catch (error) {
        post({ type: 'error', message: String(error) })
      }
      break
    case 'state':
      engine?.setState(message.state)
      break
    case 'resize':
      input.setRect(message.rect)
      engine?.resize(message.width, message.height, message.pixelRatio)
      break
    case 'input':
      input.dispatch(message.event)
      break
    case 'rotate':
      engine?.rotate(message.dTheta, message.dPhi)
      break
    case 'zoom':
      engine?.zoom(message.factor)
      break
    case 'pick':
      post({
        type: 'picked',
        id: engine?.pick(message.x, message.y) ?? null,
        seq: message.seq,
      })
      break
    case 'dispose':
      engine?.dispose()
      engine = null
      break
  }
}
