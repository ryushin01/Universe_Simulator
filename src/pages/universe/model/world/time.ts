import { both } from '@/shared/i18n'
import type { Text } from '@/shared/i18n'

export interface Speed {
  id: string
  /** 화면 1초에 흐르는 해 */
  yearsPerSecond: number
  label: Text
}

export const SPEEDS: Speed[] = [
  { id: 'hour', yearsPerSecond: 1 / 8766, label: both('1시간', '1 hour') },
  { id: 'day', yearsPerSecond: 1 / 365.25, label: both('1일', '1 day') },
  { id: 'week', yearsPerSecond: 7 / 365.25, label: both('1주', '1 week') },
  {
    id: 'month',
    yearsPerSecond: 30.44 / 365.25,
    label: both('1개월', '1 month'),
  },
  { id: 'year', yearsPerSecond: 1, label: both('1년', '1 year') },
  { id: 'decade', yearsPerSecond: 10, label: both('10년', '10 years') },
  { id: 'century', yearsPerSecond: 100, label: both('100년', '100 years') },
  { id: 'kyr', yearsPerSecond: 1e3, label: both('1천 년', '1,000 years') },
  {
    id: 'myr',
    yearsPerSecond: 1e6,
    label: both('100만 년', '1 million years'),
  },
  {
    id: 'hmyr',
    yearsPerSecond: 1e8,
    label: both('1억 년', '100 million years'),
  },
  { id: 'gyr', yearsPerSecond: 1e9, label: both('10억 년', '1 billion years') },
]

export const DEFAULT_SPEED_INDEX = 1

/** 이보다 빠르면 공전이 깜빡이므로 행성 위치를 멈춤 */
export const isOrbitFrozen = (speedIndex: number) =>
  SPEEDS[speedIndex].yearsPerSecond > 1

/**
 * 한 프레임에 진행할 최대 실제 시간. 탭을 잠시 떠났다 돌아올 때 크게 건너뛰지 않게 하되,
 * 초당 4프레임쯤인 느린 기기에서도 시간이 제 속도로 흐르도록 0.25초까지 허용
 */
export const MAX_FRAME_SECONDS = 0.25

/** 근접 통과를 N체로 계산하는 동안 한 프레임에 진행할 최대 일수 */
export const NBODY_MAX_DAYS_PER_FRAME = 1200
