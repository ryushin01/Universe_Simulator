import { createSignal } from 'solid-js'
import type { DistanceMode } from './solar/scale'

/** 우주를 보는 규모 (작은 것부터) */
export type ScaleId = 'solar' | 'stars' | 'galaxy' | 'local' | 'cosmic'

export const SCALES: ScaleId[] = ['solar', 'stars', 'galaxy', 'local', 'cosmic']

/** 고른 대상: 규모마다 따로 기억 */
export type Selection = Record<ScaleId, string | null>

export interface ViewOptions {
  orbits: boolean
  labels: boolean
  habitableZone: boolean
  autoRotate: boolean | null
  distanceMode: DistanceMode
  meteorStreams: boolean
}

const [scale, setScaleSignal] = createSignal<ScaleId>('solar')
const [selection, setSelection] = createSignal<Selection>({
  solar: 'earth',
  stars: null,
  galaxy: 'sun',
  local: 'milky-way',
  cosmic: 'laniakea',
})
/** 카메라가 따라가는 대상 (null이면 규모 전체를 봄) */
const [focus, setFocus] = createSignal<string | null>(null)
const [options, setOptions] = createSignal<ViewOptions>({
  orbits: true,
  labels: true,
  habitableZone: false,
  autoRotate: null,
  distanceMode: 'compressed',
  meteorStreams: true,
})
/** 처음 여는 소개 화면 */
const [intro, setIntro] = createSignal(true)
/** 우주 거대 구조를 볼 우주 나이 (십억 년, null이면 시뮬레이션 날짜를 따름) */
const [cosmicAge, setCosmicAge] = createSignal<number | null>(null)

export { scale, selection, focus, options, intro, cosmicAge }

export const selected = () => selection()[scale()]

export const viewActions = {
  setScale(next: ScaleId) {
    setScaleSignal(next)
    setFocus(null)
  },
  select(id: string | null, follow = true) {
    setSelection((s) => ({ ...s, [scale()]: id }))
    if (follow) setFocus(id)
  },
  /** 다른 규모의 대상을 고르고 그 규모로 이동 */
  selectIn(target: ScaleId, id: string) {
    setSelection((s) => ({ ...s, [target]: id }))
    setScaleSignal(target)
    setFocus(id)
  },
  overview() {
    setFocus(null)
  },
  setOption<K extends keyof ViewOptions>(key: K, value: ViewOptions[K]) {
    setOptions((o) => ({ ...o, [key]: value }))
  },
  closeIntro() {
    setIntro(false)
  },
  setCosmicAge(age: number | null) {
    setCosmicAge(age)
  },
}
