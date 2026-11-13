import { onCleanup, onMount } from 'solid-js'
import { worldActions } from '../model/world/store'

/** 브라우저 프레임마다 시뮬레이션 시간을 진행합니다 (3D가 없어도 돌아감) */
export function useClock() {
  onMount(() => {
    let frame = 0
    let last = performance.now()
    const loop = (now: number) => {
      worldActions.tick((now - last) / 1000)
      last = now
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    onCleanup(() => cancelAnimationFrame(frame))
  })
}
