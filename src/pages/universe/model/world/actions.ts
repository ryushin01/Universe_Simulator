import { both, compose } from '@/shared/i18n'
import type { Text } from '@/shared/i18n'
import { clamp, formatMoney, formatSig } from '@/shared/lib'
import { BODIES } from '../solar/bodies'
import type { BodyId } from '../solar/bodies'
import { MAX_YEAR } from '../solar/sun'
import { DEFLECT_METHODS, IMPACTOR_KINDS } from '../hazards/impact'
import type { DeflectMethod } from '../hazards/impact'
import { STORM_CLASSES } from '../hazards/storm'
import type { StormClass } from '../hazards/storm'
import {
  BLAST_KIND_NAME,
  BLAST_SOURCES,
  brightnessKey,
  ozoneBiosphereLoss,
  ozoneFatality,
} from '../hazards/stellar'
import { stellarEngineShiftAu } from '../hazards/flyby'
import { METEOR_SHOWERS, nextPeakYear } from '../hazards/meteors'
import { PROJECT_BY_KIND } from '../projects/catalog'
import type { ProjectKind } from '../projects/catalog'
import { advanceTo, autoIntercept, initialWorld, log } from './engine'
import {
  makeBlast,
  makeFlyby,
  makeImpact,
  makeMission,
  makeStorm,
} from './factory'
import type { FlybyInput, ImpactInput } from './factory'
import { MISSION_BY_ID } from './missions'
import {
  earthPopulation,
  hasProject,
  isRemoved,
  projectCost,
} from './selectors'
import {
  formatDuration,
  formatKm,
  formatPeople,
  formatSimDate,
  josa,
  nameOf,
} from './text'
import type { MissionId, WorldState } from './types'

export interface ActionResult {
  ok: boolean
  message: Text
}

export interface Outcome {
  state: WorldState
  result: ActionResult
}

const fail = (state: WorldState, ko: string, en: string): Outcome => ({
  state,
  result: { ok: false, message: both(ko, en) },
})

const noMoney = (state: WorldState, cost: number): Outcome => ({
  state,
  result: {
    ok: false,
    message: compose((l) =>
      l === 'ko'
        ? `예산이 모자랍니다. ${formatMoney(cost - state.budget, l)}가 더 필요합니다.`
        : `Not enough budget: ${formatMoney(cost - state.budget, l)} more needed.`,
    ),
  },
})

const done = (state: WorldState, message: Text): Outcome => ({
  state,
  result: { ok: true, message },
})

/* ── 시간 ─────────────────────────────────────────────── */

export function setSpeed(state: WorldState, speedIndex: number): WorldState {
  return { ...state, speedIndex, orbitYear: state.year }
}

/** 미래로 건너뛰기 (가는 동안의 사건을 모두 처리) */
export function jumpTo(state: WorldState, year: number): Outcome {
  if (state.nbody)
    return fail(
      state,
      '근접 통과를 계산하는 동안에는 시간을 건너뛸 수 없습니다.',
      'You cannot skip ahead while a close encounter is being computed.',
    )
  if (state.mission?.status === 'running')
    return fail(
      state,
      '미션 중에는 시간을 건너뛸 수 없습니다.',
      'You cannot skip ahead during a mission.',
    )
  const target = clamp(year, state.year, MAX_YEAR)
  if (target <= state.year)
    return fail(
      state,
      '지난 시점으로는 돌아갈 수 없습니다.',
      'You cannot go back in time.',
    )
  const next = advanceTo(state, target)
  return done(
    { ...next, orbitYear: next.year },
    compose((l) =>
      l === 'ko'
        ? `${formatSimDate(next.year, l)}(으)로 이동했습니다.`
        : `Moved to ${formatSimDate(next.year, l)}.`,
    ),
  )
}

/* ── 충돌 ─────────────────────────────────────────────── */

export function launchImpact(state: WorldState, input: ImpactInput): Outcome {
  if (isRemoved(state, input.target))
    return fail(
      state,
      '그 천체는 더는 없습니다.',
      'That body no longer exists.',
    )
  const impact = makeImpact(state, input)
  let s: WorldState = {
    ...state,
    impacts: [...state.impacts, impact],
    nextId: state.nextId + 1,
  }
  s = log(
    s,
    compose((l) => {
      const kind = IMPACTOR_KINDS[input.kind].name[l]
      return l === 'ko'
        ? `${impact.designation}: 지름 ${formatKm(input.diameterM / 1000, l)} ${kind}이(가) ${formatDuration(input.warningYears, l)} 뒤 ${nameOf(input.target, l)}에 충돌하는 궤도에 있습니다.`
        : `${impact.designation}: a ${formatKm(input.diameterM / 1000, l)} ${kind.toLowerCase()} will hit ${nameOf(input.target, l)} in ${formatDuration(input.warningYears, l)}.`
    }),
    'warn',
  )
  s = autoIntercept(s)
  return done(
    s,
    compose((l) =>
      l === 'ko'
        ? `${impact.designation}을(를) 충돌 궤도에 올렸습니다.`
        : `${impact.designation} is now on a collision course.`,
    ),
  )
}

export function launchDeflection(
  state: WorldState,
  impactId: number,
  method: DeflectMethod,
  count: number,
): Outcome {
  const impact = state.impacts.find((i) => i.id === impactId)
  if (!impact || impact.status !== 'incoming')
    return fail(state, '다가오는 천체가 없습니다.', 'No incoming object.')
  const spec = DEFLECT_METHODS[method]
  const cost = spec.costB * count
  if (state.budget < cost) return noMoney(state, cost)
  if (state.year + spec.travelYears >= impact.impactYear - 0.01)
    return fail(
      state,
      `${spec.name.ko}이(가) 닿기 전에 충돌합니다. 도착까지 ${spec.travelYears}년이 걸립니다.`,
      `It would hit before the ${spec.name.en.toLowerCase()} arrives (${spec.travelYears} years to get there).`,
    )
  const mission = makeMission(state, impact, method, count)
  const s: WorldState = {
    ...state,
    budget: state.budget - cost,
    spent: state.spent + cost,
    nextId: state.nextId + 1,
    impacts: state.impacts.map((i) =>
      i.id === impactId ? { ...i, missions: [...i.missions, mission] } : i,
    ),
  }
  return done(
    log(
      s,
      compose((l) =>
        l === 'ko'
          ? `${impact.designation}에 ${spec.name.ko} ${count}기를 보냈습니다 (${formatMoney(cost, l)}). ${formatSimDate(mission.arriveYear, l)}에 닿아 약 ${formatKm(mission.missKm, l)} 밀어냅니다.`
          : `Sent ${count} × ${spec.name.en.toLowerCase()} to ${impact.designation} (${formatMoney(cost, l)}). Arrives ${formatSimDate(mission.arriveYear, l)}, shifting it ~${formatKm(mission.missKm, l)}.`,
      ),
    ),
    compose((l) =>
      l === 'ko'
        ? `${spec.name.ko} ${count}기를 보냈습니다. 약 ${formatKm(mission.missKm, l)} 밀어냅니다.`
        : `Launched ${count} × ${spec.name.en.toLowerCase()}, worth ~${formatKm(mission.missKm, l)} of shift.`,
    ),
  )
}

/* ── 태양 폭풍 ────────────────────────────────────────── */

export function launchStorm(
  state: WorldState,
  cls: StormClass,
  target: BodyId | 'random',
): Outcome {
  const storm = makeStorm(state, cls, target)
  const spec = STORM_CLASSES[cls]
  let s: WorldState = {
    ...state,
    storms: [...state.storms, { ...storm, announced: true }],
    nextId: state.nextId + 1,
  }
  const earthHit = storm.hits.find((h) => h.body === 'earth')
  s = log(
    s,
    compose((l) => {
      const reach = storm.hits.map((h) => nameOf(h.body, l)).join(', ')
      return l === 'ko'
        ? `태양에서 ${spec.name.ko} 코로나 질량 방출이 일어났습니다 (초속 ${formatSig(spec.speedKms, l)}km). ${reach ? `닿는 곳: ${reach}` : '행성을 비껴 갑니다.'}`
        : `A ${spec.name.en} CME erupts at ${formatSig(spec.speedKms, l)} km/s. ${reach ? `In its path: ${reach}` : 'It misses every planet.'}`
    }),
    'warn',
  )
  return done(
    s,
    compose((l) => {
      if (!earthHit)
        return l === 'ko'
          ? '폭풍이 퍼지기 시작했습니다.'
          : 'The storm is spreading outward.'
      const hours = (earthHit.year - state.year) * 365.25 * 24
      return l === 'ko'
        ? `약 ${formatSig(hours, l, 2)}시간 뒤 지구에 닿습니다.`
        : `It reaches Earth in about ${formatSig(hours, l, 2)} hours.`
    }),
  )
}

/* ── 별 폭발 ──────────────────────────────────────────── */

export function triggerBlast(state: WorldState, sourceId: string): Outcome {
  const source = BLAST_SOURCES.find((s) => s.id === sourceId)
  const blast = makeBlast(state, sourceId)
  if (!source || !blast)
    return fail(state, '알 수 없는 천체입니다.', 'Unknown source.')
  if (state.blasts.some((b) => b.sourceId === sourceId && source.real))
    return fail(state, '이미 폭발했습니다.', 'It has already exploded.')
  const loss = blast.ozoneLoss
  const fatality = ozoneFatality(loss)
  const deaths = earthPopulation(state) * fatality
  let s: WorldState = {
    ...state,
    blasts: [...state.blasts, blast],
    nextId: state.nextId + 1,
    earth: {
      ...state.earth,
      ozone: Math.max(0.05, state.earth.ozone * (1 - loss)),
      popFactor: state.earth.popFactor * (1 - fatality),
      biosphere: Math.max(0, state.earth.biosphere - ozoneBiosphereLoss(loss)),
    },
  }
  const sight = brightnessKey(blast.magnitude)
  s = log(
    s,
    compose((l) => {
      const kind = BLAST_KIND_NAME[source.kind][l]
      const view = {
        flash:
          l === 'ko'
            ? '감마선이 하늘 전체를 훑고 지나갔습니다'
            : 'gamma rays swept the whole sky',
        brighterThanMoon:
          l === 'ko'
            ? '보름달보다 밝게 빛납니다'
            : 'it outshines the full Moon',
        daylight: l === 'ko' ? '낮에도 보입니다' : 'it is visible in daylight',
        bright:
          l === 'ko'
            ? '밤하늘에서 가장 밝은 별들만큼 빛납니다'
            : 'it shines like the brightest stars',
        faint:
          l === 'ko'
            ? '맨눈으로는 겨우 보입니다'
            : 'it is barely visible to the eye',
      }[sight]
      const ozone =
        loss >= 0.01
          ? l === 'ko'
            ? ` 지구 오존층이 ${Math.round(loss * 100)}% 줄었습니다.`
            : ` Earth lost ${Math.round(loss * 100)}% of its ozone.`
          : l === 'ko'
            ? ' 지구에는 거의 영향이 없습니다.'
            : ' Earth is barely affected.'
      const toll =
        deaths >= 1
          ? l === 'ko'
            ? ` 자외선이 늘어 농작물이 줄고 약 ${formatPeople(deaths, l)}이 숨질 것으로 봅니다.`
            : ` Extra UV ruins crops; about ${formatPeople(deaths, l)} may die.`
          : ''
      return l === 'ko'
        ? `${source.name.ko} ${kind} (${formatSig(source.distanceLy, l)}광년): ${view}.${ozone}${toll}`
        : `${source.name.en} ${kind.toLowerCase()} (${formatSig(source.distanceLy, l)} ly): ${view}.${ozone}${toll}`
    }),
    loss >= 0.3 ? 'danger' : loss >= 0.05 ? 'warn' : 'info',
  )
  return done(
    s,
    compose((l) =>
      l === 'ko'
        ? `${josa(source.name.ko, '이가')} 폭발했습니다.`
        : `${source.name.en} has exploded.`,
    ),
  )
}

/* ── 근접 통과 ────────────────────────────────────────── */

export function launchFlyby(state: WorldState, input: FlybyInput): Outcome {
  if (state.flybys.some((f) => f.phase === 'approach' || f.phase === 'nbody'))
    return fail(
      state,
      '이미 다가오는 천체가 있습니다. 지나간 뒤에 다시 시도하세요.',
      'Another body is already approaching. Try again after it passes.',
    )
  const flyby = makeFlyby(state, input)
  const shift = hasProject(state, 'stellar-engine')
    ? Math.min(stellarEngineShiftAu(flyby.closestYear - state.year), 1e6)
    : 0
  const next: WorldState = {
    ...state,
    flybys: [
      ...state.flybys.filter((f) => f.phase !== 'done'),
      { ...flyby, shiftAu: shift },
    ],
    nextId: state.nextId + 1,
  }
  const s = log(
    next,
    compose((l) => {
      const when = formatDuration(flyby.closestYear - state.year, l)
      const closest = formatSig(flyby.closestAu + shift, l, 3)
      const engine =
        shift > 0.01
          ? l === 'ko'
            ? ` 항성 엔진이 태양계를 옮겨 근접 거리를 ${formatSig(shift, l, 2)} AU 늘립니다.`
            : ` The stellar engine moves the Solar System, adding ${formatSig(shift, l, 2)} AU.`
          : ''
      return l === 'ko'
        ? `${flyby.name.ko}: ${when} 뒤 태양에서 ${closest} AU까지 다가옵니다.${engine}`
        : `${flyby.name.en}: closest approach of ${closest} AU in ${when}.${engine}`
    }),
    'warn',
  )
  return done(
    s,
    compose((l) =>
      l === 'ko'
        ? `${josa(flyby.name.ko, '이가')} 태양계로 다가오기 시작했습니다.`
        : `${flyby.name.en} is now heading for the Solar System.`,
    ),
  )
}

/** 사고 실험: 태양을 같은 질량의 블랙홀로 */
export function setSunBlackHole(state: WorldState, on: boolean): Outcome {
  if (state.sunBlackHole === on) return done(state, both('', ''))
  const s = log(
    { ...state, sunBlackHole: on },
    on
      ? both(
          '사고 실험: 태양이 같은 질량의 블랙홀(지름 약 6km)이 되었습니다. 중력은 그대로라 행성 궤도는 변하지 않지만, 빛이 사라져 지구가 얼어 갑니다.',
          'Thought experiment: the Sun is now a black hole of equal mass (~6 km across). Gravity — and every orbit — is unchanged, but without light Earth begins to freeze.',
        )
      : both('태양이 다시 빛납니다.', 'The Sun shines again.'),
    on ? 'danger' : 'good',
  )
  return done(
    s,
    on
      ? both('태양을 블랙홀로 바꿨습니다.', 'The Sun is now a black hole.')
      : both('태양을 되돌렸습니다.', 'The Sun has been restored.'),
  )
}

/* ── 유성우 ───────────────────────────────────────────── */

export function startMeteorStorm(state: WorldState, showerId: string): Outcome {
  const shower = METEOR_SHOWERS.find((s) => s.id === showerId)
  if (!shower) return fail(state, '알 수 없는 유성우입니다.', 'Unknown shower.')
  const peak = nextPeakYear(shower, state.year)
  const s = log(
    { ...state, meteorStorm: { showerId, untilYear: peak + 1.5 / 365.25 } },
    compose((l) =>
      l === 'ko'
        ? `${shower.parent.ko}이(가) 남긴 촘촘한 먼지 줄기를 지구가 지나갑니다. ${formatSimDate(peak, l)} ${shower.name.ko}가 유성 폭풍이 됩니다.`
        : `Earth will cross a dense dust trail from ${shower.parent.en}: the ${shower.name.en} become a meteor storm on ${formatSimDate(peak, l)}.`,
    ),
    'warn',
  )
  return done(
    s,
    compose((l) =>
      l === 'ko'
        ? `${formatSimDate(peak, l)} 극대에 유성 폭풍이 옵니다.`
        : `A meteor storm will arrive at the ${formatSimDate(peak, l)} peak.`,
    ),
  )
}

/* ── 건설 ─────────────────────────────────────────────── */

export function canBuild(state: WorldState, kind: ProjectKind): ActionResult {
  const spec = PROJECT_BY_KIND[kind]
  if (state.structures.some((s) => s.kind === kind))
    return {
      ok: false,
      message: both(
        '이미 지었거나 짓고 있습니다.',
        'Already built or under construction.',
      ),
    }
  if (isRemoved(state, spec.anchor))
    return {
      ok: false,
      message: both('지을 곳이 사라졌습니다.', 'Its site no longer exists.'),
    }
  if (
    state.sunBlackHole &&
    (kind === 'dyson-swarm' ||
      kind === 'dyson-sphere' ||
      kind === 'stellar-engine')
  )
    return {
      ok: false,
      message: both('빛나는 태양이 있어야 합니다.', 'Needs a shining Sun.'),
    }
  const missing = spec.requires?.filter((r) => !hasProject(state, r)) ?? []
  if (missing.length > 0)
    return {
      ok: false,
      message: compose((l) =>
        l === 'ko'
          ? `먼저 ${missing.map((m) => PROJECT_BY_KIND[m].name.ko).join(', ')}을(를) 완공해야 합니다.`
          : `Complete ${missing.map((m) => PROJECT_BY_KIND[m].name.en).join(', ')} first.`,
      ),
    }
  const cost = projectCost(state, kind)
  if (state.budget < cost)
    return {
      ok: false,
      message: compose((l) =>
        l === 'ko'
          ? `예산이 모자랍니다 (${formatMoney(cost - state.budget, l)} 더 필요).`
          : `Not enough budget (${formatMoney(cost - state.budget, l)} short).`,
      ),
    }
  return { ok: true, message: both('', '') }
}

export function build(
  state: WorldState,
  kind: ProjectKind,
  instant = false,
): Outcome {
  const check = canBuild(state, kind)
  if (!check.ok) return { state, result: check }
  if (instant && state.mission?.status === 'running')
    return fail(
      state,
      '미션 중에는 바로 완공할 수 없습니다.',
      'Instant build is off during missions.',
    )
  const spec = PROJECT_BY_KIND[kind]
  const cost = projectCost(state, kind)
  const structure = {
    id: state.nextId,
    kind,
    startYear: state.year,
    completeYear: state.year + (instant ? 0 : spec.buildYears),
    done: false,
  }
  let s: WorldState = {
    ...state,
    budget: state.budget - cost,
    spent: state.spent + cost,
    structures: [...state.structures, structure],
    nextId: state.nextId + 1,
  }
  if (instant) {
    s = {
      ...s,
      structures: s.structures.map((x) =>
        x.id === structure.id ? { ...x, done: true } : x,
      ),
    }
    s = log(
      s,
      compose((l) =>
        l === 'ko'
          ? `${spec.site.ko}에 ${josa(spec.name.ko, '을를')} 완공했습니다 (${formatMoney(cost, l)}).`
          : `${spec.name.en} completed at ${spec.site.en} (${formatMoney(cost, l)}).`,
      ),
      'good',
    )
    if (kind === 'defense-net') s = autoIntercept(s)
    return done(
      s,
      compose((l) =>
        l === 'ko'
          ? `${spec.site.ko}에 ${josa(spec.name.ko, '을를')} 완공했습니다.`
          : `${spec.name.en} completed at ${spec.site.en}.`,
      ),
    )
  }
  s = log(
    s,
    compose((l) =>
      l === 'ko'
        ? `${spec.site.ko}에 ${josa(spec.name.ko, '을를')} 짓기 시작했습니다 (${formatMoney(cost, l)}, ${formatSimDate(structure.completeYear, l)} 완공 예정).`
        : `Started ${spec.name.en} at ${spec.site.en} (${formatMoney(cost, l)}, due ${formatSimDate(structure.completeYear, l)}).`,
    ),
  )
  return done(
    s,
    compose((l) =>
      l === 'ko'
        ? `${josa(spec.name.ko, '을를')} 짓기 시작했습니다. ${formatSimDate(structure.completeYear, l)}에 완공합니다.`
        : `${spec.name.en} is under construction until ${formatSimDate(structure.completeYear, l)}.`,
    ),
  )
}

/* ── 미션 ─────────────────────────────────────────────── */

export function startMission(
  _state: WorldState,
  id: MissionId,
  year: number,
): Outcome {
  const spec = MISSION_BY_ID[id]
  const base = initialWorld(year)
  let s: WorldState = {
    ...base,
    budget: spec.budget,
    speedIndex: spec.speedIndex,
    mission: {
      id,
      startYear: year,
      endYear: year + spec.years,
      status: 'running',
      result: null,
      startLosses: 0,
      startBudget: spec.budget,
    },
  }
  s = spec.setup(s)
  s = log(s, spec.brief, 'warn')
  return done(
    s,
    compose((l) =>
      l === 'ko'
        ? `미션 시작: ${spec.name.ko}. 재생을 누르면 시간이 흐릅니다.`
        : `Mission started: ${spec.name.en}. Press play to start the clock.`,
    ),
  )
}

export function quitMission(state: WorldState): Outcome {
  if (!state.mission) return done(state, both('', ''))
  return done(
    { ...state, mission: null, running: false },
    both(
      '미션을 마쳤습니다. 자유 모드로 돌아갑니다.',
      'Mission closed. Back to sandbox mode.',
    ),
  )
}

export const bodyNameText = (id: BodyId): Text => BODIES[id].name
