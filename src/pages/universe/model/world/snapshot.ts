import { isBodyId } from '../solar/bodies'
import type { BodyId } from '../solar/bodies'
import { MAX_YEAR } from '../solar/sun'
import { PROJECT_BY_KIND } from '../projects/catalog'
import { METEOR_SHOWERS } from '../hazards/meteors'
import type { ProjectKind } from '../projects/catalog'
import { SPEEDS } from './time'
import { initialWorld } from './engine'
import type { OrbitOverride } from '../solar/ephemeris'
import type { RemovalReason, WorldState } from './types'

/** 공유 링크의 매개변수 이름 (?s=...) */
export const SHARE_PARAM = 's'
export const SAVE_KEY = 'universe-simulator:saves'
export const MAX_SAVES = 8

/**
 * 주소에 담는 시나리오: 시간·예산·속도·구조물·바뀐 궤도·사라진 천체·지구 상태.
 * 다가오는 소행성처럼 진행 중인 사건은 담지 않으므로, 그런 사건이 있으면 저장·공유를 막습니다
 * (`hasPendingEvents`).
 */
export interface Snapshot {
  v: 1
  year: number
  speed: number
  budget: number
  /** 누적 피해 ($B) */
  losses?: number
  /** 기지별 생존 비율 */
  colonies?: Partial<Record<ProjectKind, number>>
  /** 예약한 유성 폭풍 [유성우, 시작, 끝] */
  meteor?: [string, number, number]
  structures: Array<[ProjectKind, number, number]>
  overrides: Partial<
    Record<
      BodyId,
      [number, number, number, number, number, number, number, number]
    >
  >
  removed: Partial<Record<BodyId, [number, RemovalReason]>>
  bh: boolean
  /** 기온, 바다, 오존, 생물권, 인구 비율, 궤도 이동, 충돌 겨울 냉각 (마지막은 없을 수 있음) */
  earth:
    | [number, number, number, number, number, number]
    | [number, number, number, number, number, number, number]
  milestones: string[]
}

const REASONS: RemovalReason[] = [
  'engulfed',
  'ejected',
  'captured',
  'disrupted',
  'collided',
]

export function toSnapshot(state: WorldState): Snapshot {
  const overrides: Snapshot['overrides'] = {}
  for (const [id, o] of Object.entries(state.overrides) as Array<
    [BodyId, OrbitOverride]
  >) {
    const e = o.elements
    overrides[id] = [
      e.a,
      e.e,
      e.i,
      e.node,
      e.argPeri,
      e.meanAnomaly,
      o.epochJd,
      o.sunMass,
    ]
  }
  const removed: Snapshot['removed'] = {}
  for (const [id, r] of Object.entries(state.removed) as Array<
    [BodyId, { year: number; reason: RemovalReason }]
  >)
    removed[id] = [r.year, r.reason]
  const e = state.earth
  return {
    v: 1,
    year: state.year,
    speed: state.speedIndex,
    budget: state.budget,
    losses: state.losses,
    colonies: state.colonyHealth,
    ...(state.meteorStorm && state.meteorStorm.untilYear > state.year
      ? {
          meteor: [
            state.meteorStorm.showerId,
            state.meteorStorm.fromYear,
            state.meteorStorm.untilYear,
          ] as [string, number, number],
        }
      : {}),
    structures: state.structures.map((s) => [
      s.kind,
      s.startYear,
      s.completeYear,
    ]),
    overrides,
    removed,
    bh: state.sunBlackHole,
    earth: [
      e.tempC,
      e.ocean,
      e.ozone,
      e.biosphere,
      e.popFactor,
      e.shiftAu,
      e.coolingC,
    ],
    milestones: state.milestones,
  }
}

const finite = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max

/** 값을 하나하나 검사해 맞지 않으면 null */
export function validateSnapshot(raw: unknown): Snapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Record<string, unknown>
  if (s.v !== 1) return null
  if (!finite(s.year, 1900, MAX_YEAR)) return null
  if (!finite(s.speed, 0, SPEEDS.length - 1) || !Number.isInteger(s.speed))
    return null
  if (!finite(s.budget, -1e15, 1e18)) return null
  if (s.losses !== undefined && !finite(s.losses, 0, 1e18)) return null
  if (s.meteor !== undefined) {
    if (!Array.isArray(s.meteor) || s.meteor.length !== 3) return null
    const [shower, from, until] = s.meteor
    if (
      !METEOR_SHOWERS.some((m) => m.id === shower) ||
      !finite(from, 1900, MAX_YEAR) ||
      !finite(until, from as number, MAX_YEAR)
    )
      return null
  }
  if (s.colonies !== undefined) {
    if (!s.colonies || typeof s.colonies !== 'object') return null
    for (const [kind, health] of Object.entries(s.colonies))
      if (!Object.hasOwn(PROJECT_BY_KIND, kind) || !finite(health, 0, 1))
        return null
  }
  if (!Array.isArray(s.structures) || s.structures.length > 40) return null
  const seen = new Set<string>()
  for (const item of s.structures) {
    if (!Array.isArray(item) || item.length !== 3) return null
    const [kind, start, complete] = item
    if (
      typeof kind !== 'string' ||
      !Object.hasOwn(PROJECT_BY_KIND, kind) ||
      seen.has(kind)
    )
      return null
    seen.add(kind)
    if (
      !finite(start, 1900, MAX_YEAR) ||
      !finite(complete, start as number, MAX_YEAR)
    )
      return null
  }
  if (!s.overrides || typeof s.overrides !== 'object') return null
  for (const [id, value] of Object.entries(s.overrides)) {
    if (!isBodyId(id) || !Array.isArray(value) || value.length !== 8)
      return null
    const [a, e, i] = value
    if (!finite(a, 0.01, 20_000) || !finite(e, 0, 0.9999) || !finite(i, 0, 180))
      return null
    if (!value.every((x) => typeof x === 'number' && Number.isFinite(x)))
      return null
  }
  if (!s.removed || typeof s.removed !== 'object') return null
  for (const [id, value] of Object.entries(s.removed)) {
    if (!isBodyId(id) || !Array.isArray(value) || value.length !== 2)
      return null
    if (!finite(value[0], 1900, MAX_YEAR) || !REASONS.includes(value[1]))
      return null
  }
  if (typeof s.bh !== 'boolean') return null
  if (!Array.isArray(s.earth) || (s.earth.length !== 6 && s.earth.length !== 7))
    return null
  const [temp, ocean, ozone, bio, pop, shift, cooling = 0] = s.earth
  if (
    !finite(temp, -273, 5000) ||
    !finite(ocean, 0, 1) ||
    !finite(ozone, 0, 1) ||
    !finite(bio, 0, 100) ||
    !finite(pop, 0, 1) ||
    !finite(shift, 0, 50) ||
    !finite(cooling, -50, 0)
  )
    return null
  if (
    !Array.isArray(s.milestones) ||
    s.milestones.length > 40 ||
    !s.milestones.every((m) => typeof m === 'string' && m.length < 40)
  )
    return null
  return s as unknown as Snapshot
}

export function fromSnapshot(snapshot: Snapshot): WorldState {
  const base = initialWorld(snapshot.year)
  const overrides: WorldState['overrides'] = {}
  for (const [id, v] of Object.entries(snapshot.overrides) as Array<
    [BodyId, number[]]
  >)
    overrides[id] = {
      elements: {
        a: v[0],
        e: v[1],
        i: v[2],
        node: v[3],
        argPeri: v[4],
        meanAnomaly: v[5],
      },
      epochJd: v[6],
      sunMass: v[7],
    }
  const removed: WorldState['removed'] = {}
  for (const [id, v] of Object.entries(snapshot.removed) as Array<
    [BodyId, [number, RemovalReason]]
  >)
    removed[id] = { year: v[0], reason: v[1] }
  const [tempC, ocean, ozone, biosphere, popFactor, shiftAu, coolingC = 0] =
    snapshot.earth
  return {
    ...base,
    speedIndex: snapshot.speed,
    budget: snapshot.budget,
    losses: snapshot.losses ?? 0,
    colonyHealth: { ...snapshot.colonies },
    meteorStorm: snapshot.meteor
      ? {
          showerId: snapshot.meteor[0],
          fromYear: snapshot.meteor[1],
          untilYear: snapshot.meteor[2],
        }
      : null,
    structures: snapshot.structures.map(
      ([kind, startYear, completeYear], i) => ({
        id: i + 1,
        kind,
        startYear,
        completeYear,
        done: completeYear <= snapshot.year,
      }),
    ),
    overrides,
    removed,
    sunBlackHole: snapshot.bh,
    earth: { tempC, coolingC, ocean, ozone, biosphere, popFactor, shiftAu },
    milestones: snapshot.milestones,
    nextId: snapshot.structures.length + 1,
  }
}

/* base64url (UTF-8 안전) */
export function encodeSnapshot(snapshot: Snapshot): string {
  const bytes = new TextEncoder().encode(JSON.stringify(snapshot))
  let binary = ''
  bytes.forEach((b) => (binary += String.fromCharCode(b)))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeSnapshot(code: string): Snapshot | null {
  try {
    if (code.length > 20_000) return null
    const base64 = code.replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    return validateSnapshot(JSON.parse(new TextDecoder().decode(bytes)))
  } catch {
    return null
  }
}
