import { both, compose } from '@/shared/i18n'
import type { Text } from '@/shared/i18n'
import { formatMoney } from '@/shared/lib'
import {
  earthTemperatureC,
  isRemoved,
  marsAtmosphere,
  bodyTemperatureC,
} from './selectors'
import { makeImpact, makeStorm } from './factory'
import type { StormClass } from '../hazards/storm'
import type { BodyId } from '../solar/bodies'
import type { MissionId, Tone, WorldState } from './types'

export interface MissionSpec {
  id: MissionId
  name: Text
  brief: Text
  goal: Text
  years: number
  budget: number
  /** 권장 시간 속도 (SPEEDS의 순서) */
  speedIndex: number
  setup: (state: WorldState) => WorldState
  /** 진행 중 판정 (null이면 계속) */
  check: (state: WorldState) => 'won' | 'lost' | null
  /** 끝날 때 판정 */
  final: (state: WorldState) => 'won' | 'lost'
  result: (state: WorldState, outcome: 'won' | 'lost') => Text
}

const SOLAR_MAX_STORMS: Array<[number, StormClass, BodyId]> = [
  [0.4, 'severe', 'earth'],
  [1.6, 'strong', 'mars'],
  [2.7, 'severe', 'earth'],
  [4.4, 'carrington', 'earth'],
  [6.1, 'severe', 'earth'],
  [7.6, 'strong', 'earth'],
  [8.9, 'severe', 'earth'],
]

export const MISSIONS: MissionSpec[] = [
  {
    id: 'deflect',
    name: both('충돌 회피 작전', 'Operation Deflect'),
    brief: both(
      '가상 소행성 2026 PDC(지름 340m)가 6년 반 뒤 지구에 부딪칩니다. 예산 $12B로 궤도를 바꾸세요.',
      'Hypothetical asteroid 2026 PDC (340 m) will strike Earth in six and a half years. Change its orbit with a $12B budget.',
    ),
    goal: both(
      '빨리 보낼수록 적은 힘으로 비껴 갈 수 있습니다. 탐사선이 닿는 데 1~2년이 걸립니다.',
      'The sooner you push, the less push you need. Spacecraft take 1–2 years to arrive.',
    ),
    years: 6.6,
    budget: 12,
    speedIndex: 3,
    setup: (s) => {
      const impact = makeImpact(s, {
        target: 'earth',
        kind: 'stony',
        diameterM: 340,
        warningYears: 6.5,
        designation: '2026 PDC',
      })
      return { ...s, impacts: [...s.impacts, impact], nextId: s.nextId + 1 }
    },
    check: (s) => {
      const target = s.impacts.find((i) => i.designation === '2026 PDC')
      if (!target) return null
      if (target.status === 'hit') return 'lost'
      if (target.status === 'missed') return 'won'
      return null
    },
    final: (s) =>
      s.impacts.some((i) => i.status === 'hit' && i.target === 'earth')
        ? 'lost'
        : 'won',
    result: (s, outcome) =>
      compose((l) =>
        outcome === 'won'
          ? l === 'ko'
            ? `성공: 2026 PDC가 지구를 비껴 갔습니다. 쓴 예산 ${formatMoney(s.mission ? s.mission.startBudget - s.budget : 0, l)}.`
            : `Success: 2026 PDC missed Earth. Budget spent: ${formatMoney(s.mission ? s.mission.startBudget - s.budget : 0, l)}.`
          : l === 'ko'
            ? '실패: 2026 PDC가 지구에 충돌했습니다.'
            : 'Failure: 2026 PDC struck Earth.',
      ),
  },
  {
    id: 'solar-max',
    name: both('태양 극대기 버티기', 'Survive the Solar Maximum'),
    brief: both(
      '앞으로 10년 동안 큰 태양 폭풍이 이어지고, 그중 하나는 캐링턴급입니다. 예산 $250B로 지구 피해를 $500B 아래로 막으세요.',
      'Big solar storms will follow for ten years, one of them Carrington-class. Keep Earth’s damage under $500B with a $250B budget.',
    ),
    goal: both(
      '경보 위성과 전력망 보호 장치를 캐링턴급 폭풍이 오기 전에 완공하세요.',
      'Finish the sentinel and grid hardening before the Carrington-class storm arrives.',
    ),
    years: 10,
    budget: 250,
    speedIndex: 3,
    setup: (s) => {
      let next = s
      for (const [offset, cls, target] of SOLAR_MAX_STORMS) {
        const storm = makeStorm(next, cls, target, next.year + offset)
        next = {
          ...next,
          storms: [...next.storms, storm],
          nextId: next.nextId + 1,
        }
      }
      return next
    },
    check: (s) =>
      s.mission && s.losses - s.mission.startLosses > 500 ? 'lost' : null,
    final: () => 'won',
    result: (s, outcome) => {
      const loss = s.mission ? s.losses - s.mission.startLosses : 0
      return compose((l) =>
        outcome === 'won'
          ? l === 'ko'
            ? `성공: 10년 동안 지구 피해를 ${formatMoney(loss, l)}로 막았습니다.`
            : `Success: Earth’s damage over ten years held to ${formatMoney(loss, l)}.`
          : l === 'ko'
            ? `실패: 지구 피해가 ${formatMoney(loss, l)}로 $500B를 넘었습니다.`
            : `Failure: Earth’s damage reached ${formatMoney(loss, l)}, over $500B.`,
      )
    },
  },
  {
    id: 'mars-spring',
    name: both('붉은 행성의 봄', 'Spring on Mars'),
    brief: both(
      '500년 안에 화성 평균 기온을 영상으로, 기압을 0.3기압 이상으로 만드세요.',
      'Within 500 years, raise Mars above freezing on average with at least 0.3 bar of air.',
    ),
    goal: both(
      '자기장 방패가 있어야 테라포밍을 시작할 수 있습니다. 해마다 들어오는 예산을 모으세요.',
      'Terraforming needs the magnetic shield first. Save up your yearly budget.',
    ),
    years: 500,
    budget: 3000,
    speedIndex: 5,
    setup: (s) => s,
    check: (s) => {
      const t = bodyTemperatureC(s, 'mars')
      return t !== null && t > 0 && marsAtmosphere(s).pressureBar >= 0.3
        ? 'won'
        : null
    },
    final: () => 'lost',
    result: (s, outcome) =>
      compose((l) =>
        outcome === 'won'
          ? l === 'ko'
            ? `성공: ${Math.round(s.year - (s.mission?.startYear ?? s.year))}년 만에 화성에 봄이 왔습니다.`
            : `Success: spring came to Mars after ${Math.round(s.year - (s.mission?.startYear ?? s.year))} years.`
          : l === 'ko'
            ? '실패: 500년 안에 화성을 데우지 못했습니다.'
            : 'Failure: Mars was not warmed within 500 years.',
      ),
  },
  {
    id: 'move-earth',
    name: both('지구를 옮겨라', 'Move the Earth'),
    brief: both(
      '태양은 10억 년마다 약 10% 밝아집니다. 앞으로 30억 년 동안 지구 평균 기온이 40°C를 넘지 않게 지키세요.',
      'The Sun brightens about 10% per billion years. Keep Earth’s mean temperature at or below 40°C for three billion years.',
    ),
    goal: both(
      '우주 차양만으로는 모자랍니다. 지구 궤도를 조금씩 넓혀야 합니다.',
      'A sunshade alone is not enough — Earth’s orbit has to be widened.',
    ),
    years: 3e9,
    budget: 1000,
    speedIndex: 9,
    setup: (s) => s,
    check: (s) => {
      if (isRemoved(s, 'earth')) return 'lost'
      const t = earthTemperatureC(s)
      return t !== null && t > 40 ? 'lost' : null
    },
    final: () => 'won',
    result: (s, outcome) =>
      compose((l) =>
        outcome === 'won'
          ? l === 'ko'
            ? '성공: 30억 년 동안 지구를 살 만한 곳으로 지켰습니다.'
            : 'Success: Earth stayed livable for three billion years.'
          : l === 'ko'
            ? `실패: ${Math.round((s.year - (s.mission?.startYear ?? s.year)) / 1e6).toLocaleString('ko-KR')}백만 년 뒤 지구가 40°C를 넘었습니다.`
            : `Failure: Earth passed 40°C after ${Math.round((s.year - (s.mission?.startYear ?? s.year)) / 1e6).toLocaleString('en-US')} million years.`,
      ),
  },
]

export const MISSION_BY_ID = Object.fromEntries(
  MISSIONS.map((m) => [m.id, m]),
) as Record<MissionId, MissionSpec>

/** 진행 중인 미션을 판정하고 끝났으면 결과를 남김 */
export function evaluateMission(state: WorldState): WorldState {
  const mission = state.mission
  if (!mission || mission.status !== 'running') return state
  const spec = MISSION_BY_ID[mission.id]
  let outcome = spec.check(state)
  if (!outcome && state.year >= mission.endYear - 1e-9)
    outcome = spec.final(state)
  if (!outcome) return state
  const result = spec.result(state, outcome)
  const tone: Tone = outcome === 'won' ? 'good' : 'danger'
  const event = { id: state.nextId, year: state.year, text: result, tone }
  return {
    ...state,
    running: false,
    mission: { ...mission, status: outcome, result },
    events: [event, ...state.events].slice(0, 80),
    nextId: state.nextId + 1,
  }
}
