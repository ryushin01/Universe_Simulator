import { createSignal } from 'solid-js'
import type { BodyId } from '../solar/bodies'
import { dateToYear } from '@/shared/lib'
import type { DeflectMethod } from '../hazards/impact'
import type { StormClass } from '../hazards/storm'
import type { ProjectKind } from '../projects/catalog'
import { initialWorld, tick } from './engine'
import * as act from './actions'
import type { ActionResult } from './actions'
import type { FlybyInput, ImpactInput } from './factory'
import type { MissionId, WorldState } from './types'

/** 사전 렌더링 때 쓰는 고정 시각 (브라우저에서는 지금 시각으로 바꿈) */
export const PRERENDER_YEAR = 2026.87

/**
 * 시간이 흐르는 동안 화면 글자를 다시 그리는 간격.
 * 3D 장면은 매 프레임 `currentWorld()`로 최신 상태를 읽고,
 * 패널·카드는 이 간격으로만 갱신해 메인 스레드 부담을 줄입니다.
 * 사건이 생기거나 사용자가 조작하면 바로 갱신합니다.
 */
export const UI_INTERVAL_MS = 200

/** 매 프레임 바뀌는 최신 상태 (반응형 아님) */
let live: WorldState = initialWorld(PRERENDER_YEAR)
let publishedAt = Number.NEGATIVE_INFINITY

const [world, publish] = createSignal<WorldState>(live, { equals: false })

/** 화면(패널·카드)이 읽는 상태: 시간이 흐르는 동안에는 UI_INTERVAL_MS마다 갱신 */
export { world }

/** 3D 장면이 매 프레임 읽는 최신 상태 */
export const currentWorld = () => live

const now = () =>
  typeof performance === 'undefined' ? Date.now() : performance.now()

function commit(next: WorldState) {
  live = next
  publishedAt = now()
  publish(next)
}

const update = (change: (w: WorldState) => WorldState) => commit(change(live))

/** 브라우저에서 오늘 날짜로 시작 */
export function startAtNow() {
  update((w) =>
    w.structures.length || w.events.length
      ? w
      : initialWorld(dateToYear(new Date())),
  )
}

const apply = (run: (w: WorldState) => act.Outcome): ActionResult => {
  const outcome = run(live)
  commit(outcome.state)
  return outcome.result
}

export const worldActions = {
  tick: (dtSeconds: number) => {
    const prev = live
    if (!prev.running) return
    const next = tick(prev, dtSeconds)
    live = next
    // 사건 기록이 늘거나 멈췄으면 바로, 아니면 정해진 간격으로 화면 갱신
    if (
      next.events !== prev.events ||
      next.running !== prev.running ||
      now() - publishedAt >= UI_INTERVAL_MS
    )
      commit(next)
  },
  setRunning: (running: boolean) =>
    update((w) => ({
      ...w,
      running,
      orbitYear: running ? w.orbitYear : w.year,
    })),
  setSpeed: (index: number) => update((w) => act.setSpeed(w, index)),
  reset: () => update(() => initialWorld(dateToYear(new Date()))),
  replace: (state: WorldState) => update(() => state),
  jumpTo: (year: number) => apply((w) => act.jumpTo(w, year)),
  launchImpact: (input: ImpactInput) =>
    apply((w) => act.launchImpact(w, input)),
  launchDeflection: (impactId: number, method: DeflectMethod, count: number) =>
    apply((w) => act.launchDeflection(w, impactId, method, count)),
  launchStorm: (cls: StormClass, target: BodyId | 'random') =>
    apply((w) => act.launchStorm(w, cls, target)),
  triggerBlast: (sourceId: string) =>
    apply((w) => act.triggerBlast(w, sourceId)),
  launchFlyby: (input: FlybyInput) => apply((w) => act.launchFlyby(w, input)),
  setSunBlackHole: (on: boolean) => apply((w) => act.setSunBlackHole(w, on)),
  startMeteorStorm: (showerId: string) =>
    apply((w) => act.startMeteorStorm(w, showerId)),
  build: (kind: ProjectKind, instant = false) =>
    apply((w) => act.build(w, kind, instant)),
  startMission: (id: MissionId) =>
    apply((w) => act.startMission(w, id, dateToYear(new Date()))),
  quitMission: () => apply((w) => act.quitMission(w)),
}

/** 테스트에서 상태를 바꿀 때 */
export const __setWorldForTest = (state: WorldState) => commit(state)
