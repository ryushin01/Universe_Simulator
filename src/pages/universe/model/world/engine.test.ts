import { advanceTo, initialWorld, tick } from './engine'
import {
  build,
  jumpTo,
  launchDeflection,
  launchFlyby,
  launchImpact,
  launchStorm,
  setSpeed,
  setSunBlackHole,
  startMission,
  triggerBlast,
} from './actions'
import {
  bodyElements,
  earthTemperatureC,
  humanity,
  isRemoved,
  kardashev,
  civilizationPower,
} from './selectors'
import { yearAtSunAge } from '../solar/sun'
import { FLYBY_PRESETS } from '../hazards/flyby'
import type { WorldState } from './types'

const START = 2026.87
const fresh = () => ({ ...initialWorld(START), budget: 1e12 })
const run = (s: WorldState, years: number) => advanceTo(s, s.year + years)
const texts = (s: WorldState) => s.events.map((e) => e.text.ko).join('\n')

describe('시간 진행', () => {
  it('재생 중일 때만 속도에 맞춰 시간이 흐른다', () => {
    let s = initialWorld(START)
    expect(tick(s, 0.05).year).toBe(START)
    s = setSpeed({ ...s, running: true }, 4) // 1년/초
    const next = tick(s, 0.05)
    expect(next.year - START).toBeCloseTo(0.05, 6)
  })

  it('오늘 지구는 15°C, 인구 약 82억, 카르다쇼프 약 0.73', () => {
    const s = initialWorld(START)
    expect(earthTemperatureC(s)).toBeCloseTo(15, 0)
    expect(humanity(s) / 1e9).toBeGreaterThan(8)
    expect(kardashev(civilizationPower(s))).toBeCloseTo(0.73, 1)
  })
})

describe('충돌과 행성 방위', () => {
  it('요격망이 있으면 340m 소행성을 자동으로 비껴 가게 한다', () => {
    let s = build(fresh(), 'defense-net', true).state
    s = launchImpact(s, {
      target: 'earth',
      kind: 'stony',
      diameterM: 340,
      warningYears: 6,
    }).state
    expect(s.impacts[0].missions[0]?.auto).toBe(true)
    s = run(s, 7)
    expect(s.impacts[0].status).toBe('missed')
    expect(texts(s)).toMatch(/비껴 갔습니다/)
  })

  it('막지 못한 10km 소행성은 대멸종을 부르고 기온을 떨어뜨린다', () => {
    let s = launchImpact(fresh(), {
      target: 'earth',
      kind: 'stony',
      diameterM: 10_000,
      warningYears: 0.1,
    }).state
    s = run(s, 0.11)
    expect(s.impacts[0].status).toBe('hit')
    expect(s.impacts[0].outcome?.severity).toBe(7)
    expect(s.earth.biosphere).toBeLessThan(40)
    expect(earthTemperatureC(s)!).toBeLessThan(10)
    expect(texts(s)).toMatch(/대멸종/)
  })

  it('직접 보낸 운동 충돌체 7기로 2026 PDC 미션을 성공한다', () => {
    let s = startMission(initialWorld(START), 'deflect', START).state
    const impact = s.impacts[0]
    const launched = launchDeflection(s, impact.id, 'kinetic', 7)
    expect(launched.result.ok).toBe(true)
    s = { ...launched.state, running: true }
    while (s.mission?.status === 'running') s = tick(setSpeed(s, 10), 0.1)
    expect(s.mission?.status).toBe('won')
  })

  it('늦게 보내면 닿기 전에 충돌한다고 거절한다', () => {
    let s = launchImpact(fresh(), {
      target: 'earth',
      kind: 'stony',
      diameterM: 100,
      warningYears: 0.5,
    }).state
    const r = launchDeflection(s, s.impacts[0].id, 'kinetic', 3)
    expect(r.result.ok).toBe(false)
    s = r.state
    expect(s.impacts[0].missions).toHaveLength(0)
  })
})

describe('태양 폭풍', () => {
  it('캐링턴급 폭풍은 대비가 없으면 $2T, 경보 위성·전력망 보호가 있으면 $200B 피해', () => {
    let bare = launchStorm(fresh(), 'carrington', 'earth').state
    bare = run(bare, 0.01)
    expect(bare.losses).toBeCloseTo(2000, 0)
    expect(bare.auroras.some((a) => a.body === 'earth')).toBe(true)

    let ready = build(fresh(), 'sentinel', true).state
    ready = build(ready, 'grid-shield', true).state
    ready = launchStorm(ready, 'carrington', 'earth').state
    ready = run(ready, 0.01)
    expect(ready.losses).toBeCloseTo(200, 0)
  })
})

describe('별 폭발', () => {
  it('25광년 초신성은 오존층 절반을 없애고 베텔게우스는 거의 영향이 없다', () => {
    const near = triggerBlast(fresh(), 'near-25').state
    expect(near.earth.ozone).toBeLessThan(0.6)
    expect(near.blasts[0].debrisYear).not.toBeNull()
    const far = triggerBlast(fresh(), 'betelgeuse').state
    expect(far.earth.ozone).toBeGreaterThan(0.98)
    expect(texts(far)).toMatch(/반달|보름달|낮에도/)
  })
})

describe('태양의 미래', () => {
  it('10억 년 뒤 지구는 40°C를 넘고, 20억 년 뒤에는 바다가 줄기 시작한다', () => {
    const later = jumpTo(fresh(), START + 1.2e9).state
    expect(earthTemperatureC(later)!).toBeGreaterThan(40)
    const hot = jumpTo(fresh(), START + 2.5e9).state
    expect(hot.earth.ocean).toBeLessThan(1)
  })

  it('적색 거성 태양이 수성·금성·지구를 삼키고 화성은 남는다', () => {
    const s = jumpTo(fresh(), yearAtSunAge(12.2)).state
    expect(isRemoved(s, 'mercury')).toBe(true)
    expect(isRemoved(s, 'venus')).toBe(true)
    expect(isRemoved(s, 'earth')).toBe(true)
    expect(isRemoved(s, 'moon')).toBe(true)
    expect(isRemoved(s, 'mars')).toBe(false)
    // 태양이 질량을 잃어 화성 궤도가 넓어짐
    expect(bodyElements(s, 'mars')!.a).toBeGreaterThan(2)
    expect(texts(s)).toMatch(/헬륨 섬광/)
  })

  it('궤도 이동 엔진은 태양이 밝아지는 만큼 지구 궤도를 넓힌다', () => {
    let s = build(fresh(), 'orbit-engine', true).state
    s = jumpTo(s, START + 2e9).state
    expect(bodyElements(s, 'earth')!.a).toBeGreaterThan(1.08)
    expect(earthTemperatureC(s)!).toBeLessThan(25)
  })
})

describe('블랙홀', () => {
  it('태양을 블랙홀로 바꾸면 궤도는 그대로지만 지구가 얼어 간다', () => {
    let s = setSunBlackHole(fresh(), true).state
    const before = bodyElements(s, 'earth')!.a
    s = run(s, 10)
    expect(bodyElements(s, 'earth')!.a).toBeCloseTo(before, 5)
    expect(earthTemperatureC(s)!).toBeLessThan(-150)
  })

  it('태양 같은 별이 40AU를 지나가면 N체 계산 뒤 해왕성 궤도가 바뀐다', () => {
    const preset = FLYBY_PRESETS.find((p) => p.id === 'sun-like')!
    let s = launchFlyby(fresh(), {
      presetId: preset.id,
      kind: preset.kind,
      massSun: preset.massSun,
      closestAu: preset.closestAu,
      speedKms: preset.speedKms,
      inclination: preset.inclination,
      longitude: preset.longitude,
      name: preset.name,
    }).state
    const closest = s.flybys[0].closestYear
    s = run(s, closest - s.year + 60)
    expect(s.nbody).toBeNull()
    expect(s.flybys[0].phase).not.toBe('approach')
    const neptune = s.overrides.neptune
    if (neptune) expect(neptune.elements.e).not.toBeCloseTo(0.0086, 3)
    else expect(isRemoved(s, 'neptune')).toBe(true)
    expect(texts(s)).toMatch(/지나갔습니다/)
  })
})
