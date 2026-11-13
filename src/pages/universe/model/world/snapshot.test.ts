import { initialWorld } from './engine'
import { build, setSunBlackHole } from './actions'
import {
  decodeSnapshot,
  encodeSnapshot,
  fromSnapshot,
  toSnapshot,
  validateSnapshot,
} from './snapshot'

describe('공유 스냅숏', () => {
  it('주소로 옮겨도 구조물·궤도·지구 상태가 같다', () => {
    let state = build(
      { ...initialWorld(2030), budget: 1e9 },
      'dyson-swarm',
      true,
    ).state
    state = setSunBlackHole(state, true).state
    state = {
      ...state,
      overrides: {
        neptune: {
          elements: {
            a: 31,
            e: 0.08,
            i: 2,
            node: 130,
            argPeri: 270,
            meanAnomaly: 10,
          },
          epochJd: 2470000.5,
          sunMass: 1,
        },
      },
    }
    const code = encodeSnapshot(toSnapshot(state))
    const back = fromSnapshot(decodeSnapshot(code)!)
    expect(back.year).toBeCloseTo(2030, 6)
    expect(back.structures.map((s) => s.kind)).toEqual(['dyson-swarm'])
    expect(back.sunBlackHole).toBe(true)
    expect(back.overrides.neptune?.elements.a).toBe(31)
  })

  it('충돌 겨울 냉각·누적 피해·기지 생존율도 되살린다', () => {
    const base = initialWorld(2040)
    const state = {
      ...base,
      losses: 1234,
      colonyHealth: { 'moon-base': 0.4 },
      earth: { ...base.earth, coolingC: -8.5 },
    }
    const back = fromSnapshot(
      decodeSnapshot(encodeSnapshot(toSnapshot(state)))!,
    )
    expect(back.earth.coolingC).toBe(-8.5)
    expect(back.losses).toBe(1234)
    expect(back.colonyHealth['moon-base']).toBe(0.4)
  })

  it('예전 형식(지구 값 6개, 피해 없음)도 읽는다', () => {
    const old = { ...toSnapshot(initialWorld(2030)) }
    old.earth = old.earth.slice(0, 6) as typeof old.earth
    delete old.losses
    delete old.colonies
    const back = fromSnapshot(validateSnapshot(old)!)
    expect(back.earth.coolingC).toBe(0)
    expect(back.losses).toBe(0)
  })

  it('범위를 벗어나거나 모르는 값은 버린다', () => {
    const good = toSnapshot(initialWorld(2030))
    expect(validateSnapshot({ ...good, year: 1e20 })).toBeNull()
    expect(
      validateSnapshot({ ...good, structures: [['warp-gate', 2030, 2031]] }),
    ).toBeNull()
    expect(
      validateSnapshot({ ...good, removed: { earth: [2030, 'vanished'] } }),
    ).toBeNull()
    expect(decodeSnapshot('not-base64!!')).toBeNull()
    // 상속된 속성 이름은 구조물 종류가 아님
    expect(
      validateSnapshot({ ...good, structures: [['constructor', 2030, 2031]] }),
    ).toBeNull()
  })
})
