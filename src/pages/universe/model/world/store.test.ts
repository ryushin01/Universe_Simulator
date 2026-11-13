import { afterEach, describe, expect, it, vi } from 'vitest'
import { initialWorld } from './engine'
import {
  UI_INTERVAL_MS,
  __setWorldForTest,
  currentWorld,
  world,
  worldActions,
} from './store'

let clock = 0

const start = (overrides: Partial<ReturnType<typeof initialWorld>> = {}) => {
  vi.spyOn(performance, 'now').mockImplementation(() => clock)
  __setWorldForTest({ ...initialWorld(2030), running: true, ...overrides })
}

afterEach(() => {
  vi.restoreAllMocks()
  clock += 10_000
})

describe('world store', () => {
  it('3D가 읽는 상태는 매 프레임, 화면 상태는 간격마다 갱신', () => {
    start()
    const before = world().year
    worldActions.tick(1 / 60)
    expect(currentWorld().year).toBeGreaterThan(before)
    expect(world().year).toBe(before)

    clock += UI_INTERVAL_MS
    worldActions.tick(1 / 60)
    expect(world()).toBe(currentWorld())
  })

  it('사건이 기록되면 간격을 기다리지 않고 화면 갱신', () => {
    start({ speedIndex: 2 })
    worldActions.launchImpact({
      target: 'moon',
      kind: 'stony',
      diameterM: 100,
      warningYears: 1 / 365.25,
    })
    const logged = world().events.length
    // 하루 경고 → 1주/초 속도로 0.1초씩 몇 번이면 충돌
    for (let i = 0; i < 20 && world().events.length === logged; i++)
      worldActions.tick(0.1)
    expect(world().events.length).toBeGreaterThan(logged)
    expect(world()).toBe(currentWorld())
  })

  it('멈추기·속도 같은 조작은 바로 화면에 반영', () => {
    start()
    worldActions.tick(1 / 60)
    worldActions.setRunning(false)
    expect(world().running).toBe(false)
    expect(world().year).toBe(currentWorld().year)
    worldActions.setSpeed(4)
    expect(world().speedIndex).toBe(4)
  })
})
