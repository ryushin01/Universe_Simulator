import { both } from '@/shared/i18n'
import type { Text } from '@/shared/i18n'

export type StormClass = 'strong' | 'severe' | 'carrington' | 'superflare'

export interface StormSpec {
  /** 코로나 질량 방출(CME) 속도 (km/s) */
  speedKms: number
  /** 퍼지는 원뿔의 반각 (도) */
  halfAngle: number
  /** 아무 대비 없을 때 지구 피해 ($B) */
  earthLossB: number
  /** 마비되는 전력망 비율 */
  gridFraction: number
  /** 잃는 인공위성 비율 */
  satelliteFraction: number
  /** 대피소 없는 기지 사람 중 방사선 피해 비율 */
  colonyFraction: number
  name: Text
  note: Text
}

export const STORM_CLASSES: Record<StormClass, StormSpec> = {
  strong: {
    speedKms: 1000,
    halfAngle: 35,
    earthLossB: 2,
    gridFraction: 0,
    satelliteFraction: 0,
    colonyFraction: 0,
    name: both('강한 폭풍 (G3)', 'Strong storm (G3)'),
    note: both(
      '위성 항법 오차, 고위도 오로라',
      'GPS errors, high-latitude aurora',
    ),
  },
  severe: {
    speedKms: 1800,
    halfAngle: 45,
    earthLossB: 40,
    gridFraction: 0.02,
    satelliteFraction: 0.01,
    colonyFraction: 0.002,
    name: both('극심한 폭풍 (G5)', 'Extreme storm (G5)'),
    note: both(
      '2003년 할로윈 폭풍급: 일부 정전, 위성 고장',
      '2003 Halloween-class: local blackouts, satellite faults',
    ),
  },
  carrington: {
    speedKms: 2400,
    halfAngle: 50,
    earthLossB: 2000,
    gridFraction: 0.3,
    satelliteFraction: 0.1,
    colonyFraction: 0.02,
    name: both('캐링턴급', 'Carrington-class'),
    note: both(
      '1859년 캐링턴 사건급: 약 17시간 만에 도착, 대륙 전력망 마비',
      '1859-class: arrives in about 17 hours, continental grid collapse',
    ),
  },
  superflare: {
    speedKms: 3500,
    halfAngle: 60,
    earthLossB: 15_000,
    gridFraction: 0.9,
    satelliteFraction: 0.5,
    colonyFraction: 0.15,
    name: both('슈퍼 플레어 (가정)', 'Superflare (hypothetical)'),
    note: both(
      '캐링턴의 10배 이상. 나무 나이테에 남은 774년 미야케 사건 같은 큰 사건을 가정',
      'Ten times Carrington or more, like the 774 AD Miyake event recorded in tree rings',
    ),
  },
}

const AU_KM = 149_597_870.7

/** 태양에서 distanceAu까지 걸리는 날 */
export const stormTravelDays = (speedKms: number, distanceAu: number) =>
  (distanceAu * AU_KM) / speedKms / 86_400

/** 경보 위성은 피해 절반, 전력망 보호는 80% 줄임 (함께면 90%) */
export function stormMitigation(sentinel: boolean, grid: boolean): number {
  return 1 - (1 - (sentinel ? 0.5 : 0)) * (1 - (grid ? 0.8 : 0))
}

/** 오로라가 보이는 기간 (일) */
export const AURORA_DAYS = 3
