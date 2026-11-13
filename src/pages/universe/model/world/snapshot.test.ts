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
  })
})
