import { compose } from '@/shared/i18n'
import type { Text } from '@/shared/i18n'
import {
  clamp,
  distance,
  dot,
  formatMoney,
  formatPercent,
  formatSig,
  length,
  yearToJd,
} from '@/shared/lib'
import { BODIES } from '../solar/bodies'
import type { BodyId } from '../solar/bodies'
import { MU_SUN, elementsFromState, stateFromElements } from '../solar/kepler'
import { MAX_YEAR, STAGE_AGES, yearAtSunAge } from '../solar/sun'
import { earthTemperature, livability, oceanLossPerGyr } from '../solar/climate'
import {
  BIOSPHERE_LOSS,
  DEFLECT_METHODS,
  FATALITY_FRACTION,
  SEVERITY_TEXT,
  impactOutcome,
} from '../hazards/impact'
import { AURORA_DAYS, STORM_CLASSES, stormMitigation } from '../hazards/storm'
import { BLAST_SOURCES } from '../hazards/stellar'
import {
  AU_KM,
  INTRUDERS,
  KMS_TO_AU_PER_DAY,
  approachYears,
  flybyGeometry,
  intruderPosition,
  nbodyZone,
  tidalRadiusAu,
} from '../hazards/flyby'
import {
  createNBody,
  indexOf,
  positionOf,
  relativeState,
  step,
} from '../hazards/nbody'
import { METEOR_SHOWERS, solarLongitude } from '../hazards/meteors'
import { PROJECT_BY_KIND } from '../projects/catalog'
import {
  PRIMARY_BODIES,
  bodyElements,
  bodyInsolation,
  earthPopulation,
  hasProject,
  humanity,
  incomeB,
  isRemoved,
  meteorStormActive,
  marsAtmosphere,
  bodyTemperatureC,
  shadeFraction,
  sunRadiusAu,
  sunState,
} from './selectors'
import {
  DEFAULT_SPEED_INDEX,
  MAX_FRAME_SECONDS,
  NBODY_MAX_DAYS_PER_FRAME,
  SPEEDS,
  isOrbitFrozen,
} from './time'
import { AUTO_INTERCEPTORS, makeMission } from './factory'
import { evaluateMission } from './missions'
import { formatKm, formatPeople, josa, nameOf } from './text'
import type { Flyby, Tone, WorldState } from './types'

export const START_BUDGET = 500
/** 한 번에 적분하는 최대 구간 (년) */
const MAX_CHUNK_YEARS = 5e7
const MAX_EVENTS = 80

export function initialWorld(year: number): WorldState {
  return {
    year,
    orbitYear: year,
    running: false,
    speedIndex: DEFAULT_SPEED_INDEX,
    budget: START_BUDGET,
    spent: 0,
    losses: 0,
    structures: [],
    impacts: [],
    storms: [],
    blasts: [],
    flybys: [],
    auroras: [],
    nbody: null,
    overrides: {},
    removed: {},
    sunBlackHole: false,
    earth: {
      tempC: 15,
      coolingC: 0,
      ocean: 1,
      ozone: 1,
      biosphere: 100,
      popFactor: 1,
      shiftAu: 0,
    },
    colonyHealth: {},
    meteorStorm: null,
    milestones: [],
    events: [],
    mission: null,
    nextId: 1,
  }
}

/** 사건 기록에 한 줄 더함 */
export function log(
  state: WorldState,
  text: Text,
  tone: Tone = 'info',
): WorldState {
  const event = { id: state.nextId, year: state.year, text, tone }
  return {
    ...state,
    events: [event, ...state.events].slice(0, MAX_EVENTS),
    nextId: state.nextId + 1,
  }
}

const markMilestone = (state: WorldState, id: string): WorldState => ({
  ...state,
  milestones: [...state.milestones, id],
})

/* ── 프레임 진행 ──────────────────────────────────────── */

/** 브라우저 프레임마다 호출: 속도에 맞춰 시간을 진행합니다 */
export function tick(state: WorldState, dtSeconds: number): WorldState {
  if (!state.running) return state
  const dt = clamp(dtSeconds, 0, MAX_FRAME_SECONDS)
  let dy = SPEEDS[state.speedIndex].yearsPerSecond * dt
  if (state.nbody) dy = Math.min(dy, NBODY_MAX_DAYS_PER_FRAME / 365.25)
  let target = Math.min(state.year + dy, MAX_YEAR)
  if (state.mission?.status === 'running')
    target = Math.min(target, state.mission.endYear)
  if (target <= state.year) return { ...state, running: false }
  let next = advanceTo(state, target)
  if (state.speedIndex <= 3) next = logMeteorPeaks(state, next)
  if (next.year >= MAX_YEAR && state.year < MAX_YEAR)
    next = log(
      { ...next, running: false },
      compose((l) =>
        l === 'ko'
          ? '시뮬레이션의 끝에 닿았습니다. 백색 왜성이 된 태양이 천천히 식어 갑니다.'
          : 'The end of the simulation: the white-dwarf Sun is slowly cooling.',
      ),
    )
  return next
}

/**
 * target 해까지 사건을 시간 순서대로 처리하며 진행.
 * 도중에 N체 근접 통과가 시작되면 그 뒤로는 한 프레임 분량만 진행하고 멈춥니다
 * (N체는 하루 단위로 적분하므로 긴 구간을 한 번에 계산하면 브라우저가 멈춤).
 */
export function advanceTo(state: WorldState, target: number): WorldState {
  let end = target
  const limitIfEncounter = (s: WorldState) => {
    if (s.nbody && !state.nbody)
      end = Math.min(end, s.year + NBODY_MAX_DAYS_PER_FRAME / 365.25)
  }
  // 지금 시각에 이미 닿은 사건(예: 곧바로 N체 구역에 들어오는 근접 통과)부터 처리
  let s = processDue(state)
  limitIfEncounter(s)
  let guard = 0
  while (s.year < end && guard++ < 2000) {
    // 긴 구간도 5천만 년마다 상태를 점검해 이정표가 제때 기록되게 함
    const next = Math.min(end, nextEventYear(s, end), s.year + MAX_CHUNK_YEARS)
    // 부동소수점 누적 오차 없이 사건 시각에 정확히 맞춤
    s = { ...integrate(s, next - s.year), year: next }
    s = processDue(s)
    s = checkConditions(s)
    limitIfEncounter(s)
    if (
      state.mission?.status === 'running' &&
      s.mission?.status !== 'running'
    ) {
      s = { ...s, running: false }
      break
    }
  }
  if (!isOrbitFrozen(s.speedIndex) || s.nbody) s = { ...s, orbitYear: s.year }
  return s
}

const STAGE_EVENTS: Array<[string, number]> = [
  ['stage-subgiant', STAGE_AGES.subgiant],
  ['stage-redGiant', STAGE_AGES.redGiant],
  ['stage-tip', STAGE_AGES.heliumFlash],
  ['stage-agb', STAGE_AGES.agb],
  ['stage-nebula', STAGE_AGES.agbTip],
  ['stage-whiteDwarf', STAGE_AGES.whiteDwarf],
]

/** N체 계산이 시작되는 해 (멀리 지나가면 가장 가까운 때) */
export function flybyTriggerYear(f: Flyby): number {
  const zone = nbodyZone(f.closestAu + f.shiftAu)
  return zone === null
    ? f.closestYear
    : f.closestYear - approachYears(f.closestAu + f.shiftAu, f.speedKms)
}

function nextEventYear(s: WorldState, limit: number): number {
  let t = Infinity
  const consider = (y: number) => {
    if (y > s.year && y <= limit && y < t) t = y
  }
  for (const st of s.structures) if (!st.done) consider(st.completeYear)
  for (const im of s.impacts) {
    if (im.status !== 'incoming') continue
    consider(im.impactYear)
    for (const m of im.missions) if (!m.applied) consider(m.arriveYear)
  }
  for (const storm of s.storms) {
    if (!storm.announced) consider(storm.launchYear)
    for (const h of storm.hits) if (!h.done) consider(h.year)
  }
  for (const b of s.blasts)
    if (b.debrisYear !== null && !b.debrisDone) consider(b.debrisYear)
  for (const f of s.flybys) {
    if (f.phase === 'approach') consider(flybyTriggerYear(f))
    if (f.showerUntil !== null) consider(f.showerUntil)
  }
  if (!s.sunBlackHole)
    for (const [id, age] of STAGE_EVENTS)
      if (!s.milestones.includes(id)) consider(yearAtSunAge(age))
  if (s.mission?.status === 'running') consider(s.mission.endYear)
  return t
}

/* ── 연속 과정 ────────────────────────────────────────── */

function integrate(state: WorldState, years: number): WorldState {
  if (years <= 0) return state
  let s = state
  if (s.nbody) s = stepNBody(s, years)
  const steps = years > 2e7 ? Math.min(80, Math.ceil(years / 2e7)) : 1
  const dt = years / steps
  const earth = { ...s.earth }
  const colonyHealth = { ...s.colonyHealth }
  let budget = s.budget
  let year = state.year
  for (let k = 0; k < steps; k++) {
    year += dt
    const probe: WorldState = { ...s, year, earth, colonyHealth }
    if (!isRemoved(probe, 'earth')) {
      const target = earthTemperature(bodyInsolation(probe, 'earth'))
      earth.tempC = target + (earth.tempC - target) * Math.exp(-dt / 2.4)
      earth.coolingC *= Math.exp(-dt / 3)
      const t = earth.tempC + earth.coolingC
      earth.ocean = Math.max(0, earth.ocean - (oceanLossPerGyr(t) * dt) / 1e9)
      const bioTarget = livability(t, earth.ocean) > 0.15 ? 100 : 0
      const tau = bioTarget === 100 ? 5e6 : 2e5
      earth.biosphere =
        bioTarget + (earth.biosphere - bioTarget) * Math.exp(-dt / tau)
      earth.ozone = 1 - (1 - earth.ozone) * Math.exp(-dt / 5)
      earth.popFactor = 1 - (1 - earth.popFactor) * Math.exp(-dt / 40)
      if (!s.nbody && hasProject(probe, 'orbit-engine')) {
        // 태양이 밝아지는 만큼 (받는 햇빛 1을 유지하도록) 궤도를 넓힘
        const base =
          bodyElements({ ...probe, earth: { ...earth, shiftAu: 0 } }, 'earth')
            ?.a ?? 1
        const lum =
          Math.max(sunState(probe).luminosity, 0) * (1 - shadeFraction(probe))
        const wanted = clamp(Math.sqrt(lum) * 1.00000261 - base, 0, 20)
        const maxMove = 3e-10 * dt
        earth.shiftAu += clamp(wanted - earth.shiftAu, -maxMove, maxMove)
      }
    }
    for (const kind of Object.keys(colonyHealth) as Array<
      keyof typeof colonyHealth
    >)
      colonyHealth[kind] =
        1 - (1 - (colonyHealth[kind] ?? 1)) * Math.exp(-dt / 20)
    budget += incomeB(probe) * dt
  }
  return { ...s, year, earth, colonyHealth, budget }
}

/* ── N체 근접 통과 ────────────────────────────────────── */

const EARTH_MASSES_PER_SUN = 332_946

function startNBody(state: WorldState, flyby: Flyby): WorldState {
  const s = { ...state, orbitYear: state.year }
  const sun = sunState(s)
  const muSun = MU_SUN * sun.mass
  const bodies: Array<{
    id: string
    mu: number
    r: [number, number, number]
    v: [number, number, number]
  }> = [{ id: 'sun', mu: muSun, r: [0, 0, 0], v: [0, 0, 0] }]
  for (const id of PRIMARY_BODIES) {
    const el = bodyElements(s, id)
    if (!el) continue
    const { r, v } = stateFromElements(el, muSun)
    const massive = BODIES[id].kind === 'planet'
    bodies.push({
      id,
      mu: massive ? (MU_SUN * BODIES[id].massEarth) / EARTH_MASSES_PER_SUN : 0,
      r,
      v,
    })
  }
  const { bVec, vHat } = flybyGeometry(
    flyby.closestAu + flyby.shiftAu,
    flyby.inclination,
    flyby.longitude,
  )
  const r = intruderPosition(
    bVec,
    vHat,
    flyby.speedKms,
    s.year - flyby.closestYear,
  )
  const speed = flyby.speedKms * KMS_TO_AU_PER_DAY
  bodies.push({
    id: 'intruder',
    mu: MU_SUN * flyby.massSun,
    r,
    v: [vHat[0] * speed, vHat[1] * speed, vHat[2] * speed],
  })
  const next: WorldState = {
    ...s,
    nbody: createNBody(bodies, yearToJd(s.year)),
    flybys: s.flybys.map((f) =>
      f.id === flyby.id ? { ...f, phase: 'nbody' as const } : f,
    ),
  }
  return log(
    next,
    compose((l) =>
      l === 'ko'
        ? `${flyby.name.ko}이(가) 태양계 안쪽으로 들어왔습니다. 행성들의 중력을 모두 계산(N체)하는 동안 시간 속도를 늦춥니다.`
        : `${flyby.name.en} is entering the Solar System. Time slows while every body’s gravity is computed (N-body).`,
    ),
    'warn',
  )
}

function stepNBody(state: WorldState, years: number): WorldState {
  let nb = state.nbody
  const flyby = state.flybys.find((f) => f.phase === 'nbody')
  if (!nb || !flyby) return { ...state, nbody: null }
  const spec = INTRUDERS[flyby.kind]
  const sun = sunState(state)
  const doomed = new Map<string, 'disrupted' | 'collided'>()
  let days = years * 365.25
  while (days > 1e-9) {
    const ii = indexOf(nb, 'intruder')
    const pi = positionOf(nb, ii)
    let closest = Infinity
    for (let i = 1; i < nb.ids.length; i++) {
      if (i === ii) continue
      const d = distance(positionOf(nb, i), pi)
      if (d < closest) closest = d
      const id = nb.ids[i] as BodyId
      const body = BODIES[id]
      const limit = spec.blackHole
        ? tidalRadiusAu(body.radiusKm, body.massEarth, flyby.massSun)
        : (body.radiusKm +
            spec.radiusKm * (flyby.massSun / spec.massSun) ** 0.8) /
          AU_KM
      if (!doomed.has(id) && d < limit)
        doomed.set(id, spec.blackHole ? 'disrupted' : 'collided')
      if (
        !doomed.has(id) &&
        distance(positionOf(nb, i), positionOf(nb, 0)) < sun.radius * 0.00465
      )
        doomed.set(id, 'collided')
    }
    const h = Math.min(closest < 0.05 ? 0.05 : closest < 0.3 ? 0.25 : 1, days)
    step(nb, h)
    days -= h
  }
  let s: WorldState = state
  if (doomed.size > 0) {
    const removed = { ...s.removed }
    for (const [id, reason] of doomed) {
      removed[id as BodyId] = { year: s.year + years, reason }
      s = log(
        s,
        compose((l) => {
          const name = nameOf(id as BodyId, l)
          if (l === 'ko')
            return reason === 'disrupted'
              ? `${name}이(가) 블랙홀의 조석력에 찢겨 나갔습니다 (스파게티화).`
              : `${josa(name, '이가')} 다른 천체와 부딪쳐 부서졌습니다.`
          return reason === 'disrupted'
            ? `${name} was torn apart by the black hole’s tides (spaghettification).`
            : `${name} was destroyed in a collision.`
        }),
        'danger',
      )
    }
    // 사라진 천체를 빼고 다시 구성
    const keep = nb.ids
      .map((id, i) => ({ id, i }))
      .filter(({ id }) => !doomed.has(id))
      .map(({ id, i }) => ({
        id,
        mu: nb!.mu[i],
        r: positionOf(nb!, i),
        v: [nb!.vel[3 * i], nb!.vel[3 * i + 1], nb!.vel[3 * i + 2]] as [
          number,
          number,
          number,
        ],
      }))
    nb = createNBody(keep, nb.jd)
    s = { ...s, removed, nbody: nb }
  }
  const ii = indexOf(nb, 'intruder')
  const rel = relativeState(nb, ii, 0)
  const zone = nbodyZone(flyby.closestAu + flyby.shiftAu) ?? 150
  if (length(rel.r) > zone * 1.05 && dot(rel.r, rel.v) > 0)
    return finishNBody({ ...s, year: state.year }, flyby)
  return s
}

function finishNBody(state: WorldState, flyby: Flyby): WorldState {
  const nb = state.nbody
  if (!nb) return state
  const sun = sunState(state)
  const muSun = MU_SUN * sun.mass
  const ii = indexOf(nb, 'intruder')
  const overrides = { ...state.overrides }
  const removed = { ...state.removed }
  const changes: Array<{
    id: BodyId
    a0: number
    a1: number
    e0: number
    e1: number
  }> = []
  const lost: Array<{ id: BodyId; reason: 'ejected' | 'captured' }> = []
  for (let i = 1; i < nb.ids.length; i++) {
    if (i === ii) continue
    const id = nb.ids[i] as BodyId
    const rel = relativeState(nb, i, 0)
    const el = elementsFromState(rel.r, rel.v, muSun)
    const before = bodyElements({ ...state, nbody: null }, id)
    if (el.e >= 1 || el.a > 20_000) {
      const relI = relativeState(nb, i, ii)
      const energy = 0.5 * dot(relI.v, relI.v) - nb.mu[ii] / length(relI.r)
      const reason = energy < 0 ? 'captured' : 'ejected'
      removed[id] = { year: state.year, reason }
      lost.push({ id, reason })
      continue
    }
    overrides[id] = { elements: el, epochJd: nb.jd, sunMass: sun.mass }
    if (
      before &&
      (Math.abs(el.a - before.a) / before.a > 0.003 ||
        Math.abs(el.e - before.e) > 0.005)
    )
      changes.push({ id, a0: before.a, a1: el.a, e0: before.e, e1: el.e })
  }
  let s: WorldState = {
    ...state,
    nbody: null,
    overrides,
    removed,
    earth: { ...state.earth, shiftAu: 0 },
    flybys: state.flybys.map((f) =>
      f.id === flyby.id ? { ...f, phase: 'leaving' as const } : f,
    ),
  }
  const summary = compose((l) => {
    const parts = changes
      .slice(0, 5)
      .map(
        (c) =>
          `${nameOf(c.id, l)} a ${formatSig(c.a0, l, 4)}→${formatSig(c.a1, l, 4)} AU, e ${formatSig(c.e0, l, 2)}→${formatSig(c.e1, l, 2)}`,
      )
    const head =
      l === 'ko'
        ? `${flyby.name.ko}이(가) 지나갔습니다.`
        : `${flyby.name.en} has passed.`
    if (parts.length === 0)
      return `${head} ${l === 'ko' ? '행성 궤도는 거의 그대로입니다.' : 'Planetary orbits are almost unchanged.'}`
    return `${head} ${l === 'ko' ? '궤도 변화:' : 'Orbit changes:'} ${parts.join(' · ')}`
  })
  s = log(s, summary, changes.some((c) => c.id === 'earth') ? 'warn' : 'info')
  for (const { id, reason } of lost)
    s = log(
      s,
      compose((l) => {
        const name = nameOf(id, l)
        if (l === 'ko')
          return reason === 'captured'
            ? `${josa(name, '이가')} 지나가던 천체에 붙잡혀 함께 떠났습니다.`
            : `${josa(name, '이가')} 태양계 밖으로 튕겨 나갔습니다. 이제 떠돌이 천체입니다.`
        return reason === 'captured'
          ? `${name} was captured by the passing body and carried away.`
          : `${name} was flung out of the Solar System and now drifts alone.`
      }),
      'danger',
    )
  return s
}

/* ── 사건 처리 ────────────────────────────────────────── */

function processDue(state: WorldState): WorldState {
  let s = state
  s = completeStructures(s)
  s = applyMissions(s)
  s = resolveImpacts(s)
  s = resolveStorms(s)
  s = resolveBlasts(s)
  s = resolveFlybys(s)
  s = resolveStages(s)
  return s
}

function completeStructures(state: WorldState): WorldState {
  let s = state
  for (const st of state.structures) {
    if (st.done || st.completeYear > s.year) continue
    s = {
      ...s,
      structures: s.structures.map((x) =>
        x.id === st.id ? { ...x, done: true } : x,
      ),
    }
    const spec = PROJECT_BY_KIND[st.kind]
    s = log(
      s,
      compose((l) =>
        l === 'ko'
          ? `${spec.site.ko}에 ${josa(spec.name.ko, '을를')} 완공했습니다.`
          : `${spec.name.en} completed at ${spec.site.en}.`,
      ),
      'good',
    )
    if (st.kind === 'defense-net') s = autoIntercept(s)
  }
  return s
}

/** 행성 방위 요격망: 1년 넘게 남은 지구 충돌체에 운동 충돌체를 보냄 */
export function autoIntercept(state: WorldState): WorldState {
  if (!hasProject(state, 'defense-net')) return state
  let s = state
  for (const im of state.impacts) {
    if (im.status !== 'incoming' || im.target !== 'earth') continue
    if (im.missions.some((m) => m.auto)) continue
    if (im.impactYear - s.year <= DEFLECT_METHODS.kinetic.travelYears) continue
    const mission = makeMission(s, im, 'kinetic', AUTO_INTERCEPTORS, true)
    s = {
      ...s,
      impacts: s.impacts.map((x) =>
        x.id === im.id ? { ...x, missions: [...x.missions, mission] } : x,
      ),
      nextId: s.nextId + 1,
    }
    s = log(
      s,
      compose((l) =>
        l === 'ko'
          ? `행성 방위 요격망이 ${im.designation}에 운동 충돌체 ${AUTO_INTERCEPTORS}기를 보냈습니다.`
          : `The defence network launched ${AUTO_INTERCEPTORS} kinetic impactors at ${im.designation}.`,
      ),
    )
  }
  return s
}

function applyMissions(state: WorldState): WorldState {
  let s = state
  for (const im of state.impacts) {
    for (const m of im.missions) {
      if (m.applied || m.arriveYear > s.year || im.status !== 'incoming')
        continue
      s = {
        ...s,
        impacts: s.impacts.map((x) =>
          x.id === im.id
            ? {
                ...x,
                missions: x.missions.map((y) =>
                  y.id === m.id ? { ...y, applied: true } : y,
                ),
              }
            : x,
        ),
      }
      s = log(
        s,
        compose((l) => {
          const method = DEFLECT_METHODS[m.method].name[l]
          return l === 'ko'
            ? `${method} ${m.count}기가 ${im.designation}에 닿아 궤도를 ${formatKm(m.missKm, l)} 밀어냈습니다.`
            : `${m.count} × ${method} reached ${im.designation}, shifting it ${formatKm(m.missKm, l)}.`
        }),
      )
    }
  }
  return s
}

function resolveImpacts(state: WorldState): WorldState {
  let s = state
  for (const im of state.impacts) {
    if (im.status !== 'incoming' || im.impactYear > s.year) continue
    const miss = im.missions
      .filter((m) => m.applied)
      .reduce((sum, m) => sum + m.missKm, 0)
    if (isRemoved(s, im.target)) {
      s = {
        ...s,
        impacts: s.impacts.map((x) =>
          x.id === im.id ? { ...x, status: 'missed' as const } : x,
        ),
      }
      continue
    }
    if (miss >= im.requiredKm) {
      s = {
        ...s,
        impacts: s.impacts.map((x) =>
          x.id === im.id ? { ...x, status: 'missed' as const } : x,
        ),
      }
      s = log(
        s,
        compose((l) => {
          const name = nameOf(im.target, l)
          const gap = formatKm(miss - BODIES[im.target].radiusKm, l)
          return l === 'ko'
            ? `${im.designation}이(가) ${name}을(를) 비껴 갔습니다. 표면에서 약 ${gap} 떨어져 지나갔습니다.`
            : `${im.designation} missed ${name}, passing about ${gap} above the surface.`
        }),
        'good',
      )
      continue
    }
    const outcome = impactOutcome(im.target, im.kind, im.diameterM)
    let deaths = 0
    let next: WorldState = s
    if (im.target === 'earth') {
      const fraction = FATALITY_FRACTION[outcome.severity]
      deaths = earthPopulation(s) * fraction
      next = {
        ...next,
        earth: {
          ...next.earth,
          popFactor: next.earth.popFactor * (1 - fraction),
          biosphere: Math.max(
            0,
            next.earth.biosphere - BIOSPHERE_LOSS[outcome.severity],
          ),
          coolingC: Math.min(next.earth.coolingC, outcome.coolingC),
        },
      }
    }
    // 그 천체의 기지
    const colonyKind =
      im.target === 'moon'
        ? 'moon-base'
        : im.target === 'mars'
          ? 'mars-city'
          : im.target === 'titan'
            ? 'titan-base'
            : null
    if (colonyKind && hasProject(s, colonyKind)) {
      const fraction = Math.min(1, FATALITY_FRACTION[outcome.severity] * 3)
      next = {
        ...next,
        colonyHealth: {
          ...next.colonyHealth,
          [colonyKind]: (next.colonyHealth[colonyKind] ?? 1) * (1 - fraction),
        },
      }
    }
    // 천체가 부서질 만큼 큰 에너지 (중력 결합 에너지 3GM²/5R)
    const body = BODIES[im.target]
    const massKg = body.massEarth * 5.972e24
    const binding =
      (3 * 6.674e-11 * massKg * massKg) / (5 * body.radiusKm * 1000)
    const shattered = outcome.energyMt * 4.184e15 > binding
    next = {
      ...next,
      impacts: next.impacts.map((x) =>
        x.id === im.id ? { ...x, status: 'hit' as const, outcome, deaths } : x,
      ),
      removed: shattered
        ? {
            ...next.removed,
            [im.target]: { year: next.year, reason: 'disrupted' as const },
          }
        : next.removed,
    }
    next = log(
      next,
      compose((l) => {
        const name = nameOf(im.target, l)
        const detail = shattered
          ? l === 'ko'
            ? `${josa(name, '이가')} 산산조각 났습니다.`
            : `${name} was shattered.`
          : outcome.scarKm
            ? l === 'ko'
              ? `대기에 지름 ${formatKm(outcome.scarKm, l)}의 검은 흔적이 남았습니다.`
              : `A dark scar ${formatKm(outcome.scarKm, l)} wide spreads in the atmosphere.`
            : outcome.craterKm
              ? l === 'ko'
                ? `지름 ${formatKm(outcome.craterKm, l)} 크레이터가 생겼습니다.`
                : `It left a crater ${formatKm(outcome.craterKm, l)} across.`
              : ''
        const toll =
          deaths >= 1
            ? l === 'ko'
              ? ` 사망 추정 ${formatPeople(deaths, l)}.`
              : ` Estimated deaths: ${formatPeople(deaths, l)}.`
            : ''
        const sev =
          im.target === 'earth' ? ` ${SEVERITY_TEXT[outcome.severity][l]}.` : ''
        return l === 'ko'
          ? `${im.designation}(지름 ${formatKm(im.diameterM / 1000, l)})이(가) ${name}에 충돌했습니다. ${detail}${sev}${toll}`
          : `${im.designation} (${formatKm(im.diameterM / 1000, l)} wide) struck ${name}. ${detail}${sev}${toll}`
      }),
      outcome.severity >= 3 || shattered ? 'danger' : 'warn',
    )
    s = next
  }
  return s
}

function resolveStorms(state: WorldState): WorldState {
  let s = state
  for (const storm of state.storms) {
    const spec = STORM_CLASSES[storm.cls]
    if (!storm.announced && storm.launchYear <= s.year) {
      s = {
        ...s,
        storms: s.storms.map((x) =>
          x.id === storm.id ? { ...x, announced: true } : x,
        ),
      }
      s = log(
        s,
        compose((l) =>
          l === 'ko'
            ? `태양에서 ${spec.name.ko} 코로나 질량 방출이 일어났습니다.`
            : `The Sun launched a ${spec.name.en} coronal mass ejection.`,
        ),
        'warn',
      )
    }
    for (const hit of storm.hits) {
      if (hit.done || hit.year > s.year) continue
      s = {
        ...s,
        storms: s.storms.map((x) =>
          x.id === storm.id
            ? {
                ...x,
                hits: x.hits.map((h) =>
                  h.body === hit.body ? { ...h, done: true } : h,
                ),
              }
            : x,
        ),
      }
      if (isRemoved(s, hit.body)) continue
      const strength = {
        strong: 0.5,
        severe: 0.8,
        carrington: 1,
        superflare: 1,
      }[storm.cls]
      if (BODIES[hit.body].magnetosphere || hit.body === 'mars')
        s = {
          ...s,
          auroras: [
            ...s.auroras.filter((a) => a.body !== hit.body),
            {
              body: hit.body,
              untilYear: s.year + AURORA_DAYS / 365.25,
              strength,
            },
          ],
        }
      if (hit.body === 'earth') s = stormHitsEarth(s, storm.cls)
      if (
        hit.body === 'mars' &&
        hasProject(s, 'mars-city') &&
        !hasProject(s, 'mars-shield')
      ) {
        const fraction = spec.colonyFraction
        s = {
          ...s,
          colonyHealth: {
            ...s.colonyHealth,
            'mars-city': (s.colonyHealth['mars-city'] ?? 1) * (1 - fraction),
          },
        }
        s = log(
          s,
          compose((l) =>
            l === 'ko'
              ? `태양 폭풍이 화성 도시를 덮쳤습니다. 자기장 방패가 없어 주민 ${formatPercent(fraction, l, 1)}가 방사선 피해를 입었습니다.`
              : `The storm hit the Mars city; without a magnetic shield ${formatPercent(fraction, l, 1)} of residents suffered radiation injuries.`,
          ),
          'warn',
        )
      }
    }
  }
  return s
}

function stormHitsEarth(
  state: WorldState,
  cls: keyof typeof STORM_CLASSES,
): WorldState {
  const spec = STORM_CLASSES[cls]
  const mitigation = stormMitigation(
    hasProject(state, 'sentinel'),
    hasProject(state, 'grid-shield'),
  )
  const loss = spec.earthLossB * (1 - mitigation)
  let s: WorldState = { ...state, losses: state.losses + loss }
  for (const kind of ['moon-base', 'oneill'] as const) {
    if (!hasProject(s, kind)) continue
    const fraction = spec.colonyFraction * (kind === 'moon-base' ? 0.5 : 0.3)
    s = {
      ...s,
      colonyHealth: {
        ...s.colonyHealth,
        [kind]: (s.colonyHealth[kind] ?? 1) * (1 - fraction),
      },
    }
  }
  return log(
    s,
    compose((l) => {
      const grid = spec.gridFraction * (1 - mitigation)
      const base =
        l === 'ko'
          ? `${spec.name.ko} 태양 폭풍이 지구에 닿았습니다. 오로라가 낮은 위도까지 내려옵니다.`
          : `A ${spec.name.en} storm reached Earth; aurorae spread to low latitudes.`
      const damage =
        loss >= 0.5
          ? l === 'ko'
            ? ` 피해 ${formatMoney(loss, l)}${grid >= 0.01 ? `, 전력망 ${formatPercent(grid, l)} 마비` : ''}${mitigation > 0 ? ` (대비로 ${formatPercent(mitigation, l)} 줄임)` : ''}.`
            : ` Damage ${formatMoney(loss, l)}${grid >= 0.01 ? `, ${formatPercent(grid, l)} of grids down` : ''}${mitigation > 0 ? ` (${formatPercent(mitigation, l)} averted)` : ''}.`
          : ''
      return base + damage
    }),
    loss >= 100 ? 'danger' : 'warn',
  )
}

function resolveBlasts(state: WorldState): WorldState {
  let s = state
  for (const b of state.blasts) {
    if (b.debrisYear === null || b.debrisDone || b.debrisYear > s.year) continue
    const extra = b.ozoneLoss * 0.3
    s = {
      ...s,
      blasts: s.blasts.map((x) =>
        x.id === b.id ? { ...x, debrisDone: true } : x,
      ),
      earth: { ...s.earth, ozone: Math.max(0.05, s.earth.ozone * (1 - extra)) },
    }
    const source = BLAST_SOURCES.find((x) => x.id === b.sourceId)
    s = log(
      s,
      compose((l) =>
        l === 'ko'
          ? `${source?.name.ko ?? ''} 폭발의 잔해와 우주선(宇宙線)이 태양계에 닿았습니다. 해저 퇴적층에 철-60이 쌓입니다.`
          : `Debris and cosmic rays from ${source?.name.en ?? 'the explosion'} reached the Solar System; iron-60 settles into seafloor sediments.`,
      ),
      'warn',
    )
  }
  return s
}

function resolveFlybys(state: WorldState): WorldState {
  let s = state
  for (const f of state.flybys) {
    if (f.phase === 'approach' && flybyTriggerYear(f) <= s.year) {
      if (nbodyZone(f.closestAu + f.shiftAu) !== null) {
        if (!s.nbody) s = startNBody(s, f)
      } else {
        s = {
          ...s,
          flybys: s.flybys.map((x) =>
            x.id === f.id
              ? { ...x, phase: 'leaving' as const, showerUntil: s.year + 3e6 }
              : x,
          ),
        }
        s = log(
          s,
          compose((l) =>
            l === 'ko'
              ? `${f.name.ko}이(가) 태양에서 약 ${formatSig(f.closestAu + f.shiftAu, l, 3)} AU까지 다가왔습니다. 오르트 구름이 흔들려 앞으로 약 300만 년 동안 혜성이 늘어납니다.`
              : `${f.name.en} came within ~${formatSig(f.closestAu + f.shiftAu, l, 3)} AU of the Sun. The Oort cloud is stirred; comets increase for ~3 million years.`,
          ),
          'warn',
        )
      }
    }
    if (f.showerUntil !== null && f.showerUntil <= s.year) {
      s = {
        ...s,
        flybys: s.flybys.map((x) =>
          x.id === f.id
            ? { ...x, showerUntil: null, phase: 'done' as const }
            : x,
        ),
      }
      s = log(
        s,
        compose((l) =>
          l === 'ko'
            ? '혜성 소나기가 잦아들었습니다.'
            : 'The comet shower has faded.',
        ),
      )
    }
  }
  return s
}

const STAGE_TEXT: Record<string, Text> = {
  'stage-subgiant': {
    ko: '태양 중심의 수소가 바닥났습니다. 태양이 준거성이 되어 부풀기 시작합니다.',
    en: 'Core hydrogen is exhausted; the Sun becomes a subgiant and starts to swell.',
  },
  'stage-redGiant': {
    ko: '태양이 적색 거성 가지에 올라섰습니다. 수억 년 동안 수백 배로 커집니다.',
    en: 'The Sun climbs the red-giant branch, growing hundreds of times larger.',
  },
  'stage-tip': {
    ko: '헬륨 섬광: 적색 거성 태양의 중심에서 헬륨이 타기 시작해 다시 작아집니다.',
    en: 'Helium flash: helium ignites in the core and the giant Sun shrinks again.',
  },
  'stage-agb': {
    ko: '태양이 점근 거성 가지로 들어섰습니다. 두 번째로 부풀며 바깥층을 잃습니다.',
    en: 'The Sun enters the asymptotic giant branch, swelling again and shedding its outer layers.',
  },
  'stage-nebula': {
    ko: '태양이 바깥층을 날려 보내 행성상 성운이 생겼습니다.',
    en: 'The Sun has ejected its envelope as a planetary nebula.',
  },
  'stage-whiteDwarf': {
    ko: '태양이 지구만 한 백색 왜성이 되었습니다. 수십억 년에 걸쳐 식어 갑니다.',
    en: 'The Sun is now an Earth-sized white dwarf, cooling over billions of years.',
  },
}

function resolveStages(state: WorldState): WorldState {
  let s = state
  if (s.sunBlackHole) return s
  for (const [id, age] of STAGE_EVENTS) {
    if (s.milestones.includes(id) || yearAtSunAge(age) > s.year) continue
    s = log(markMilestone(s, id), STAGE_TEXT[id], 'warn')
  }
  return s
}

/* ── 상태 점검 ────────────────────────────────────────── */

function checkConditions(state: WorldState): WorldState {
  let s = state
  // 커진 태양이 행성을 삼킴 (적색 거성 때는 조석 마찰로 1.45배 거리까지)
  const sun = sunState(s)
  if (!sun.blackHole) {
    // 거성 단계에서는 조석 마찰로 반지름의 1.45배 안쪽 궤도까지 끌려 들어감 (Schröder & Smith 2008)
    const reach = sunRadiusAu(s) * (sun.radius > 5 ? 1.45 : 1)
    for (const id of PRIMARY_BODIES) {
      if (isRemoved(s, id)) continue
      const el = bodyElements(s, id)
      if (!el || el.a * (1 - el.e) >= reach) continue
      s = {
        ...s,
        removed: {
          ...s.removed,
          [id]: { year: s.year, reason: 'engulfed' as const },
        },
      }
      s = log(
        s,
        compose((l) => {
          const name = nameOf(id, l)
          return l === 'ko'
            ? `부풀어 오른 태양이 ${josa(name, '을를')} 삼켰습니다.`
            : `The swollen Sun has engulfed ${name}.`
        }),
        'danger',
      )
    }
  }
  if (!isRemoved(s, 'earth')) {
    const t = s.earth.tempC + s.earth.coolingC
    if (t > 35 && !s.milestones.includes('earth-hot'))
      s = log(
        markMilestone(s, 'earth-hot'),
        compose((l) =>
          l === 'ko'
            ? '지구 평균 기온이 35°C를 넘었습니다. 적도 지방에서는 사람이 버티기 어렵습니다.'
            : 'Earth’s mean temperature passed 35°C; the tropics become unlivable.',
        ),
        'warn',
      )
    if (s.earth.ocean < 0.5 && !s.milestones.includes('ocean-half'))
      s = log(
        markMilestone(s, 'ocean-half'),
        compose((l) =>
          l === 'ko'
            ? '지구 바다의 절반이 수증기가 되어 우주로 빠져나갔습니다.'
            : 'Half of Earth’s oceans have boiled off into space.',
        ),
        'danger',
      )
    if (s.earth.ocean <= 0 && !s.milestones.includes('ocean-gone'))
      s = log(
        markMilestone(s, 'ocean-gone'),
        compose((l) =>
          l === 'ko'
            ? '지구의 바다가 모두 사라졌습니다.'
            : 'Earth’s oceans are gone.',
        ),
        'danger',
      )
    if (t < -15 && !s.milestones.includes('earth-frozen'))
      s = log(
        markMilestone(s, 'earth-frozen'),
        compose((l) =>
          l === 'ko'
            ? '지구가 얼어붙었습니다 (눈덩이 지구).'
            : 'Earth has frozen over (snowball Earth).',
        ),
        'danger',
      )
  }
  const mars = marsAtmosphere(s)
  const marsT = bodyTemperatureC(s, 'mars')
  if (
    marsT !== null &&
    marsT > 0 &&
    mars.pressureBar >= 0.3 &&
    !s.milestones.includes('mars-spring')
  )
    s = log(
      markMilestone(s, 'mars-spring'),
      compose((l) =>
        l === 'ko'
          ? '화성에 봄이 왔습니다: 평균 기온이 영상이고 기압이 0.3기압을 넘었습니다.'
          : 'Spring on Mars: the mean temperature is above freezing and pressure exceeds 0.3 bar.',
      ),
      'good',
    )
  if (humanity(s) < 1 && !s.milestones.includes('humanity-lost'))
    s = log(
      markMilestone(s, 'humanity-lost'),
      compose((l) =>
        l === 'ko'
          ? '인류 문명이 사라졌습니다. 우주는 계속 흘러갑니다.'
          : 'Human civilisation is gone. The cosmos carries on.',
      ),
      'danger',
    )
  // 멀어진 침입 천체 정리
  if (s.flybys.some((f) => f.phase === 'leaving' && f.showerUntil === null))
    s = {
      ...s,
      flybys: s.flybys.map((f) =>
        f.phase === 'leaving' &&
        f.showerUntil === null &&
        s.year - f.closestYear > 3 * approachYears(f.closestAu, f.speedKms)
          ? { ...f, phase: 'done' as const }
          : f,
      ),
    }
  return evaluateMission(s)
}

/* ── 유성우 ───────────────────────────────────────────── */

function logMeteorPeaks(before: WorldState, after: WorldState): WorldState {
  if (after.year - before.year > 0.2 || isRemoved(after, 'earth')) return after
  const l0 = solarLongitude(before.year)
  const l1 = solarLongitude(after.year)
  let s = after
  for (const shower of METEOR_SHOWERS) {
    const crossed =
      l1 >= l0
        ? shower.peakLongitude > l0 && shower.peakLongitude <= l1
        : shower.peakLongitude > l0 || shower.peakLongitude <= l1
    if (!crossed) continue
    const storm = meteorStormActive(s, shower.id)
    s = log(
      s,
      compose((l) =>
        l === 'ko'
          ? `${shower.name.ko} 극대입니다 (시간당 약 ${formatSig(storm ? shower.zhr * 200 : shower.zhr, l, 2)}개${storm ? ', 유성 폭풍' : ''}). 모천체: ${shower.parent.ko}`
          : `${shower.name.en} peak (about ${formatSig(storm ? shower.zhr * 200 : shower.zhr, l, 2)} per hour${storm ? ', meteor storm' : ''}). Parent: ${shower.parent.en}`,
      ),
      storm ? 'warn' : 'info',
    )
  }
  return s
}
