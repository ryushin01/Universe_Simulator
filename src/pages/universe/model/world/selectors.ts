import { clamp, length, scale, yearToJd } from '@/shared/lib'
import type { Vec3 } from '@/shared/lib'
import { BODIES, BODY_IDS } from '../solar/bodies'
import type { BodyId } from '../solar/bodies'
import { heliocentricElements, satelliteOffsetKm } from '../solar/ephemeris'
import { positionFromElements } from '../solar/kepler'
import type { Elements } from '../solar/kepler'
import { sunAgeGyr, sunAt } from '../solar/sun'
import type { SunState } from '../solar/sun'
import {
  habitableZone,
  insolation,
  livability,
  scaledTemperature,
} from '../solar/climate'
import { ELEVATOR_DISCOUNT, PROJECT_BY_KIND } from '../projects/catalog'
import type { ProjectKind } from '../projects/catalog'
import { indexOf, positionOf } from '../hazards/nbody'
import { intruderPosition, flybyGeometry } from '../hazards/flyby'
import { activeShower, METEOR_STORM_FACTOR } from '../hazards/meteors'
import type { Flyby, Storm, Structure, WorldState } from './types'

export const AU_KM = 149_597_870.7
const SUN_RADIUS_AU = 695_700 / AU_KM

/* ── 태양 ─────────────────────────────────────────────── */

export interface SunView extends SunState {
  blackHole: boolean
}

export function sunState(state: WorldState): SunView {
  const sun = sunAt(sunAgeGyr(state.year))
  if (!state.sunBlackHole) return { ...sun, blackHole: false }
  // 같은 질량의 블랙홀: 빛이 없고 사건의 지평선(약 3km)만 남음
  return {
    ...sun,
    luminosity: 0,
    radius: (2.95 / 695_700) * sun.mass,
    temperature: 0,
    blackHole: true,
  }
}

export const sunRadiusAu = (state: WorldState) =>
  sunState(state).radius * SUN_RADIUS_AU

/* ── 구조물 ───────────────────────────────────────────── */

export const isComplete = (state: WorldState, s: Structure) =>
  state.year >= s.completeYear

export const hasProject = (state: WorldState, kind: ProjectKind) =>
  state.structures.some((s) => s.kind === kind && isComplete(state, s))

export const startedProject = (state: WorldState, kind: ProjectKind) =>
  state.structures.find((s) => s.kind === kind)

export const projectProgress = (state: WorldState, s: Structure) =>
  clamp(
    (state.year - s.startYear) / Math.max(1e-9, s.completeYear - s.startYear),
    0,
    1,
  )

/** 완공 뒤 지난 해 (안 지었으면 null) */
export function yearsSinceComplete(
  state: WorldState,
  kind: ProjectKind,
): number | null {
  const s = state.structures.find((x) => x.kind === kind)
  if (!s || state.year < s.completeYear) return null
  return state.year - s.completeYear
}

export function projectCost(state: WorldState, kind: ProjectKind): number {
  const base = PROJECT_BY_KIND[kind].costB
  return kind !== 'space-elevator' && hasProject(state, 'space-elevator')
    ? base * ELEVATOR_DISCOUNT
    : base
}

/** 지구에 오는 햇빛을 가리는 비율 */
export const shadeFraction = (state: WorldState) =>
  hasProject(state, 'sunshade') ? 0.02 : 0

/** 다이슨 구조물이 모으는 태양빛 비율 (완공 뒤 서서히 늘어남) */
export function dysonCapture(state: WorldState): {
  swarm: number
  sphere: number
} {
  const swarmAge = yearsSinceComplete(state, 'dyson-swarm')
  const sphereAge = yearsSinceComplete(state, 'dyson-sphere')
  return {
    swarm: swarmAge === null ? 0 : 0.01 * Math.min(1, swarmAge / 100),
    sphere: sphereAge === null ? 0 : Math.min(1, sphereAge / 500),
  }
}

/** 다이슨 구 껍질 반지름 (AU) */
export const DYSON_SPHERE_AU = 2

/* ── 천체 위치 ─────────────────────────────────────────── */

export const isRemoved = (state: WorldState, id: BodyId): boolean => {
  if (state.removed[id]) return true
  const parent = BODIES[id].parent
  return parent ? Boolean(state.removed[parent]) : false
}

/** 태양 질량이 줄어 넓어진 궤도 배율 */
export function expansion(state: WorldState, id: BodyId): number {
  const override = state.overrides[id]
  return (override?.sunMass ?? 1) / sunState(state).mass
}

/** 지금 태양 기준 궤도 요소 (질량 손실·궤도 이동 반영) */
export function bodyElements(state: WorldState, id: BodyId): Elements | null {
  if (isRemoved(state, id)) return null
  const jd = yearToJd(state.orbitYear)
  const el = heliocentricElements(id, jd, state.overrides[id])
  if (!el) return null
  const f = expansion(state, id)
  const shift = id === 'earth' ? state.earth.shiftAu : 0
  return { ...el, a: el.a * f + shift }
}

/** 태양 기준 위치 (AU, 황도). 위성은 모행성 + 실제 거리 */
export function bodyPositionAu(state: WorldState, id: BodyId): Vec3 | null {
  if (id === 'sun') return [0, 0, 0]
  if (isRemoved(state, id)) return null
  const body = BODIES[id]
  if (body.parent) {
    const parent = bodyPositionAu(state, body.parent)
    if (!parent) return null
    const off = satelliteOffsetKm(id, yearToJd(state.orbitYear))
    return [
      parent[0] + off[0] / AU_KM,
      parent[1] + off[1] / AU_KM,
      parent[2] + off[2] / AU_KM,
    ]
  }
  const nb = state.nbody
  if (nb) {
    const i = indexOf(nb, id)
    if (i >= 0) {
      const p = positionOf(nb, i)
      const s = positionOf(nb, 0)
      return [p[0] - s[0], p[1] - s[1], p[2] - s[2]]
    }
  }
  const el = bodyElements(state, id)
  if (!el) return null
  return positionFromElements(el)
}

/** 미래 시각의 위치 (N체 계산 없이 궤도 요소로) */
export function bodyPositionAt(
  state: WorldState,
  id: BodyId,
  year: number,
): Vec3 | null {
  return bodyPositionAu({ ...state, orbitYear: year, nbody: null }, id)
}

/* ── 햇빛과 기온 ──────────────────────────────────────── */

/** 오늘(원래 궤도, 태양 광도 1)의 받는 햇빛 */
function baselineInsolation(id: BodyId): number {
  const host = BODIES[id].parent ?? id
  const el = heliocentricElements(host, 2451545)
  if (!el) return 1
  return insolation(1, el.a, el.e)
}

/** 지금 받는 햇빛 (오늘 지구 = 1). 궤도 평균, 다이슨 구 바깥은 어두움 */
export function bodyInsolation(state: WorldState, id: BodyId): number {
  if (id === 'sun') return 0
  const host = BODIES[id].parent ?? id
  const el = bodyElements(state, host)
  if (!el) return 0
  const sun = sunState(state)
  let s = insolation(
    sun.luminosity,
    el.a,
    el.e,
    id === 'earth' ? shadeFraction(state) : 0,
  )
  if (el.a > DYSON_SPHERE_AU) s *= 1 - dysonCapture(state).sphere
  return s
}

export function earthTemperatureC(state: WorldState): number | null {
  if (isRemoved(state, 'earth')) return null
  return state.earth.tempC + state.earth.coolingC
}

/** 화성 대기: 기압(bar)과 방패·테라포밍으로 오른 기온 */
export function marsAtmosphere(state: WorldState): {
  pressureBar: number
  bonusC: number
} {
  const shield = yearsSinceComplete(state, 'mars-shield')
  const terraform = yearsSinceComplete(state, 'terraform-mars')
  const shieldBonus = shield === null ? 0 : 4 * Math.min(1, shield / 50)
  const terraBonus =
    terraform === null ? 0 : 75 * (1 - Math.exp(-terraform / 150))
  const pressure =
    0.006 +
    (shield === null ? 0 : 0.004 * Math.min(1, shield / 100)) +
    (terraform === null ? 0 : 0.8 * (1 - Math.exp(-terraform / 200)))
  return { pressureBar: pressure, bonusC: shieldBonus + terraBonus }
}

/** 천체의 지금 평균 기온 (°C) */
export function bodyTemperatureC(state: WorldState, id: BodyId): number | null {
  if (isRemoved(state, id)) return null
  if (id === 'sun') return sunState(state).temperature - 273.15
  if (id === 'earth') return earthTemperatureC(state)
  const ratio = bodyInsolation(state, id) / baselineInsolation(id)
  const base = scaledTemperature(BODIES[id].meanTempC, ratio)
  return id === 'mars' ? base + marsAtmosphere(state).bonusC : base
}

export function habitableZoneNow(state: WorldState) {
  return habitableZone(Math.max(sunState(state).luminosity, 1e-9))
}

/** 태양과의 지금 거리 (AU) */
export function bodyDistanceAu(state: WorldState, id: BodyId): number | null {
  const p = bodyPositionAu(state, id)
  return p ? length(p) : null
}

/* ── 문명 ─────────────────────────────────────────────── */

const POWER_NOW_W = 1.9e13
const EARTH_POWER_CAP_W = 1e17
const SUN_LUMINOSITY_W = 3.828e26

/** 지구 인구 기준선 (2080년대 약 103억 명에서 멈춤) */
export function baselinePopulation(year: number): number {
  if (year <= 2026) return 8.2e9
  return 1e9 * (10.3 - 2.1 * Math.exp(-(year - 2026) / 25))
}

export function earthPopulation(state: WorldState): number {
  const t = earthTemperatureC(state)
  if (t === null) return 0
  return (
    baselinePopulation(state.year) *
    state.earth.popFactor *
    livability(t, state.earth.ocean)
  )
}

const COLONY_KINDS: ProjectKind[] = [
  'moon-base',
  'mars-city',
  'titan-base',
  'oneill',
  'ringworld',
]

/** 기지가 있는 천체의 환경 (0~1) */
function colonyEnvironment(state: WorldState, kind: ProjectKind): number {
  const anchor = PROJECT_BY_KIND[kind].anchor
  if (isRemoved(state, anchor)) return 0
  if (kind === 'oneill' || kind === 'ringworld')
    return state.sunBlackHole ? 0.3 : 1
  const t = bodyTemperatureC(state, anchor)
  if (t === null) return 0
  return t > 150 ? 0 : t > 80 ? 0.3 : 1
}

export function colonyPopulation(state: WorldState, kind: ProjectKind): number {
  const age = yearsSinceComplete(state, kind)
  const capacity = PROJECT_BY_KIND[kind].population ?? 0
  if (age === null || capacity === 0) return 0
  const grown = capacity / (1 + (capacity / 100 - 1) * Math.exp(-0.08 * age))
  return (
    grown * (state.colonyHealth[kind] ?? 1) * colonyEnvironment(state, kind)
  )
}

export function offWorldPopulation(state: WorldState): number {
  return COLONY_KINDS.reduce(
    (sum, kind) => sum + colonyPopulation(state, kind),
    0,
  )
}

export const humanity = (state: WorldState) =>
  earthPopulation(state) + offWorldPopulation(state)

/** 문명이 쓰는 에너지 (W) */
export function civilizationPower(state: WorldState): number {
  const people = humanity(state)
  if (people < 1) return 0
  const grown = Math.min(
    EARTH_POWER_CAP_W,
    POWER_NOW_W * Math.exp(0.015 * Math.max(0, state.year - 2026)),
  )
  const share = clamp(people / 8.2e9, 0, 1.5)
  const { swarm, sphere } = dysonCapture(state)
  const dyson =
    sunState(state).luminosity *
    SUN_LUMINOSITY_W *
    Math.min(1, swarm + sphere) *
    0.25
  return grown * share + dyson
}

/** 카르다쇼프 척도 (칼 세이건의 연속식): K = (log₁₀P − 6) / 10 */
export const kardashev = (powerW: number) =>
  powerW > 0 ? (Math.log10(powerW) - 6) / 10 : null

/** 해마다 쓸 수 있는 우주 예산 ($B) */
export function incomeB(state: WorldState): number {
  if (state.mission && !MISSION_INCOME[state.mission.id]) return 0
  const power = civilizationPower(state)
  return power > 0 ? 120 * Math.sqrt(power / POWER_NOW_W) : 0
}

/** 미션 중 수입이 있는지 */
export const MISSION_INCOME: Record<string, boolean> = {
  deflect: false,
  'solar-max': false,
  'mars-spring': true,
  'move-earth': true,
}

/* ── 재해 ─────────────────────────────────────────────── */

/** 태양 폭풍 앞면의 반지름 (AU) */
export const stormFrontAu = (storm: Storm, year: number, speedKms: number) =>
  Math.max(0, ((year - storm.launchYear) * 365.25 * 86_400 * speedKms) / AU_KM)

/**
 * 저장·공유 링크에 담지 못하는 진행 중인 사건이 있는지:
 * 다가오는 소행성, 아직 닿지 않은 태양 폭풍, 근접 통과, 아직 오지 않은 별 폭발 잔해, 진행 중인 미션
 */
export function hasPendingEvents(state: WorldState): boolean {
  return (
    state.mission?.status === 'running' ||
    state.impacts.some((im) => im.status === 'incoming') ||
    state.storms.some((st) => !st.announced || st.hits.some((h) => !h.done)) ||
    state.flybys.some((f) => f.phase !== 'done') ||
    state.blasts.some((b) => b.debrisYear !== null && !b.debrisDone)
  )
}

/**
 * 지금 태양계를 지나가는 중인 근접 통과 (없으면 undefined).
 * 앞선 천체가 멀어지는 동안 새 천체를 보낼 수 있으므로 다가오는·N체 계산 중인 것을 먼저 고름
 */
export const activeFlyby = (state: WorldState): Flyby | undefined =>
  state.flybys.find((f) => f.phase === 'approach' || f.phase === 'nbody') ??
  state.flybys.find((f) => f.phase === 'leaving')

/** 침입 천체의 태양 기준 위치 (AU) */
export function intruderPositionAu(state: WorldState, flyby: Flyby): Vec3 {
  const nb = state.nbody
  if (nb && flyby.phase === 'nbody') {
    const i = indexOf(nb, 'intruder')
    if (i >= 0) {
      const p = positionOf(nb, i)
      const s = positionOf(nb, 0)
      return [p[0] - s[0], p[1] - s[1], p[2] - s[2]]
    }
  }
  const { bVec, vHat } = flybyGeometry(
    flyby.closestAu + flyby.shiftAu,
    flyby.inclination,
    flyby.longitude,
  )
  return intruderPosition(
    bVec,
    vHat,
    flyby.speedKms,
    state.year - flyby.closestYear,
  )
}

export function activeAuroras(state: WorldState) {
  return state.auroras.filter((a) => a.untilYear > state.year)
}

/** 유성 폭풍 기간(극대 하루 전부터 하루 반 뒤까지)인지 */
export const meteorStormActive = (state: WorldState, showerId?: string) =>
  state.meteorStorm !== null &&
  (showerId === undefined || state.meteorStorm.showerId === showerId) &&
  state.meteorStorm.fromYear <= state.year &&
  state.year < state.meteorStorm.untilYear

export function currentShower(state: WorldState) {
  const storm =
    state.meteorStorm && meteorStormActive(state)
      ? { showerId: state.meteorStorm.showerId, factor: METEOR_STORM_FACTOR }
      : null
  return activeShower(state.year, storm)
}

/** 이 천체 둘레에 지은(또는 짓는) 구조물 */
export const structuresAt = (state: WorldState, id: BodyId) =>
  state.structures.filter((s) => PROJECT_BY_KIND[s.kind].anchor === id)

/** 탐사 단계: 기지·테라포밍이 있으면 올라감 */
export function explorationLevel(state: WorldState, id: BodyId): number {
  let level: number = BODIES[id].explored
  for (const s of structuresAt(state, id)) {
    if (!isComplete(state, s)) continue
    if (s.kind === 'terraform-mars') level = Math.max(level, 6)
    else if (PROJECT_BY_KIND[s.kind].population) level = Math.max(level, 5)
  }
  return level
}

/** 거주 가능도 (0~1): 기온과 (지구는) 바다·생물권 */
export function habitabilityScore(state: WorldState, id: BodyId): number {
  if (id === 'earth') {
    const t = earthTemperatureC(state)
    return t === null
      ? 0
      : livability(t, state.earth.ocean) * (state.earth.biosphere / 100)
  }
  const t = bodyTemperatureC(state, id)
  if (
    t === null ||
    id === 'sun' ||
    (BODIES[id].kind === 'planet' && BODIES[id].massEarth > 10)
  )
    return 0
  const air =
    id === 'mars'
      ? clamp(marsAtmosphere(state).pressureBar / 0.5, 0, 1)
      : id === 'titan'
        ? 0.6
        : 0.05
  return livability(t, 1) * air
}

/** 행성·왜소 행성·혜성처럼 태양을 직접 도는 천체 */
export const PRIMARY_BODIES = BODY_IDS.filter(
  (id) => id !== 'sun' && !BODIES[id].parent,
)

/** 원래 궤도 크기를 몇 배로 */
export const scaled = (p: Vec3, f: number) => scale(p, f)
