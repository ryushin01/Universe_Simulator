import type { Text } from '@/shared/i18n'
import {
  DEG,
  dot,
  length,
  normalize,
  seededRandom,
  wrapDeg,
} from '@/shared/lib'
import type { Vec3 } from '@/shared/lib'
import { BODIES } from '../solar/bodies'
import type { BodyId } from '../solar/bodies'
import { eclipticLongitude } from '../solar/ephemeris'
import {
  DEFLECT_METHODS,
  deflectionKm,
  requiredMissKm,
} from '../hazards/impact'
import type { DeflectMethod, ImpactorKind } from '../hazards/impact'
import { STORM_CLASSES, stormTravelDays } from '../hazards/storm'
import type { StormClass } from '../hazards/storm'
import {
  BLAST_SOURCES,
  debrisArrivalYears,
  ozoneLoss,
  peakApparentMagnitude,
} from '../hazards/stellar'
import { approachYears, nbodyZone } from '../hazards/flyby'
import type { IntruderKind } from '../hazards/flyby'
import { PRIMARY_BODIES, bodyPositionAt } from './selectors'
import type {
  Blast,
  DeflectionMission,
  Flyby,
  Impact,
  Storm,
  StormHit,
  WorldState,
} from './types'

/** 1년 넘게 앞서 찾은 지구 충돌체에 행성 방위 요격망이 보내는 수 */
export const AUTO_INTERCEPTORS = 10

const LETTERS = 'ABCDEFGHJKLMNOPQRSTUVWXYZ'

/** 소행성 임시 이름 꼴 (예: 2026 VK3) */
export function designation(year: number, id: number): string {
  const y = Math.floor(year)
  const label = y < 100_000 ? String(y) : 'X'
  const a = LETTERS[id % LETTERS.length]
  const b = LETTERS[(id * 7) % LETTERS.length]
  return `${label} ${a}${b}${(id % 9) + 1}`
}

function randomUnit(random: () => number): Vec3 {
  const z = random() * 2 - 1
  const t = random() * 2 * Math.PI
  const r = Math.sqrt(1 - z * z)
  return [r * Math.cos(t), r * Math.sin(t), z]
}

export interface ImpactInput {
  target: BodyId
  kind: ImpactorKind
  diameterM: number
  warningYears: number
  designation?: string
}

export function makeImpact(state: WorldState, input: ImpactInput): Impact {
  const random = seededRandom(state.nextId * 7919 + Math.floor(input.diameterM))
  // 공전 궤도면 가까이에서 다가오도록 위아래 성분을 줄임
  const raw = randomUnit(random)
  const approach = normalize([raw[0], raw[1], raw[2] * 0.3])
  return {
    id: state.nextId,
    designation: input.designation ?? designation(state.year, state.nextId),
    target: input.target,
    kind: input.kind,
    diameterM: input.diameterM,
    createdYear: state.year,
    impactYear: state.year + input.warningYears,
    approach,
    site: randomUnit(random),
    requiredKm: requiredMissKm(input.target, input.kind),
    missions: [],
    status: 'incoming',
  }
}

export function makeMission(
  state: WorldState,
  impact: Impact,
  method: DeflectMethod,
  count: number,
  auto = false,
): DeflectionMission {
  const spec = DEFLECT_METHODS[method]
  const arriveYear = state.year + spec.travelYears
  const lead = impact.impactYear - arriveYear
  return {
    id: state.nextId,
    method,
    count,
    launchYear: state.year,
    arriveYear,
    missKm: deflectionKm(method, count, impact, lead),
    applied: false,
    auto,
  }
}

/**
 * 태양 폭풍: 겨냥한 천체 쪽 황경으로 원뿔처럼 퍼지며,
 * 도착할 때 원뿔 안에 있는 천체에 닿습니다.
 */
export function makeStorm(
  state: WorldState,
  cls: StormClass,
  target: BodyId | 'random',
  launchYear = state.year,
): Storm {
  const spec = STORM_CLASSES[cls]
  const random = seededRandom(state.nextId * 104_729)
  let longitude: number
  if (target === 'random') longitude = random() * 360
  else {
    const host = BODIES[target].parent ?? target
    const p = bodyPositionAt(state, host, launchYear)
    longitude = p ? eclipticLongitude(p) : random() * 360
    // 도착하는 동안 행성이 움직이는 만큼 앞쪽을 겨냥 (대략)
    if (p) {
      const days = stormTravelDays(spec.speedKms, length(p))
      const ahead = bodyPositionAt(state, host, launchYear + days / 365.25)
      if (ahead) longitude = eclipticLongitude(ahead)
    }
  }
  const dir: Vec3 = [Math.cos(longitude * DEG), Math.sin(longitude * DEG), 0]
  const hits: StormHit[] = []
  for (const id of PRIMARY_BODIES) {
    if (state.removed[id]) continue
    const start = bodyPositionAt(state, id, launchYear)
    if (!start) continue
    const firstGuess = stormTravelDays(spec.speedKms, length(start)) / 365.25
    const there = bodyPositionAt(state, id, launchYear + firstGuess)
    if (!there) continue
    const r = length(there)
    const cos = dot(normalize(there), dir)
    if (cos >= Math.cos(spec.halfAngle * DEG))
      hits.push({
        body: id,
        year: launchYear + stormTravelDays(spec.speedKms, r) / 365.25,
        done: false,
      })
  }
  hits.sort((a, b) => a.year - b.year)
  return {
    id: state.nextId,
    cls,
    launchYear,
    longitude: wrapDeg(longitude),
    hits,
    announced: launchYear <= state.year,
  }
}

export function makeBlast(state: WorldState, sourceId: string): Blast | null {
  const source = BLAST_SOURCES.find((s) => s.id === sourceId)
  if (!source) return null
  const close = source.distanceLy <= 100
  return {
    id: state.nextId,
    sourceId,
    kind: source.kind,
    year: state.year,
    distanceLy: source.distanceLy,
    ra: source.ra,
    dec: source.dec,
    ozoneLoss: ozoneLoss(source),
    magnitude: peakApparentMagnitude(source),
    debrisYear:
      close && source.kind !== 'grb' && source.kind !== 'magnetar'
        ? state.year + debrisArrivalYears(source.distanceLy)
        : null,
    debrisDone: false,
  }
}

export interface FlybyInput {
  presetId: string | null
  kind: IntruderKind
  massSun: number
  closestAu: number
  speedKms: number
  inclination: number
  longitude: number
  leadYears?: number
  name: Text
}

export function makeFlyby(state: WorldState, input: FlybyInput): Flyby {
  const lead =
    input.leadYears ??
    (nbodyZone(input.closestAu) !== null
      ? approachYears(input.closestAu, input.speedKms)
      : 1e5)
  return {
    id: state.nextId,
    presetId: input.presetId,
    kind: input.kind,
    massSun: input.massSun,
    closestAu: input.closestAu,
    speedKms: input.speedKms,
    inclination: input.inclination,
    longitude: input.longitude,
    closestYear: state.year + lead,
    name: input.name,
    phase: 'approach',
    shiftAu: 0,
    showerUntil: null,
  }
}
