import { For } from 'solid-js'
import styles from './IntroRings.module.css'

/** 행성을 감싼 가는 동심 궤도선과 궤도 위의 원형 노드 (장식) */
const RINGS = [
  { r: 210, nodes: [200] },
  { r: 300, nodes: [20, 250] },
  { r: 430, nodes: [140] },
  { r: 600, nodes: [75, 300] },
]

export function IntroRings() {
  return (
    <svg class={styles.rings} viewBox="-700 -700 1400 1400" aria-hidden="true">
      <For each={RINGS}>
        {(ring, index) => (
          <g
            class={styles.ring}
            style={{ 'animation-duration': `${160 + index() * 70}s` }}
          >
            <circle r={ring.r} class={styles.orbit} />
            <For each={ring.nodes}>
              {(deg) => {
                const a = (deg * Math.PI) / 180
                const x = Math.cos(a) * ring.r
                const y = Math.sin(a) * ring.r
                return (
                  <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
                    <circle r="11" class={styles.node} />
                    <circle r="3.5" class={styles.dot} />
                  </g>
                )
              }}
            </For>
          </g>
        )}
      </For>
    </svg>
  )
}
