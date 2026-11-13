import { both } from '@/shared/i18n'
import type { Text } from '@/shared/i18n'
import { BODIES } from '../solar/bodies'
import type { BodyId } from '../solar/bodies'

export type ImpactorKind = 'stony' | 'iron' | 'comet'

export const IMPACTOR_KINDS: Record<
  ImpactorKind,
  { density: number; speedKms: number; name: Text }
> = {
  stony: {
    density: 3000,
    speedKms: 20,
    name: both('암석질 소행성', 'Stony asteroid'),
  },
  iron: {
    density: 7800,
    speedKms: 20,
    name: both('철질 소행성', 'Iron asteroid'),
  },
  comet: { density: 600, speedKms: 50, name: both('혜성', 'Comet') },
}

/** 지름 고르기 단계 (m) */
export const DIAMETER_STEPS = [
  10, 20, 50, 100, 200, 340, 500, 1000, 2000, 5000, 10_000, 20_000, 50_000,
  100_000,
] as const

/** 발견부터 충돌까지 (년) */
export const WARNING_STEPS = [
  { id: 'day', years: 1 / 365.25 },
  { id: 'month', years: 30 / 365.25 },
  { id: 'year1', years: 1 },
  { id: 'year5', years: 5 },
  { id: 'year10', years: 10 },
  { id: 'year30', years: 30 },
] as const
export type WarningId = (typeof WARNING_STEPS)[number]['id']

/** 충돌 대상이 될 수 있는 천체 */
export const IMPACT_TARGETS: BodyId[] = [
  'earth',
  'moon',
  'mars',
  'venus',
  'mercury',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'ceres',
  'europa',
  'titan',
  'pluto',
]

const GAS_GIANTS = new Set<BodyId>(['jupiter', 'saturn', 'uranus', 'neptune'])
const ICY = new Set<BodyId>([
  'europa',
  'ganymede',
  'callisto',
  'titan',
  'pluto',
  'ceres',
])

export const isGasGiant = (id: BodyId) => GAS_GIANTS.has(id)

export const impactorMassKg = (diameterM: number, density: number) =>
  (Math.PI / 6) * diameterM ** 3 * density

/** 탈출 속도 (km/s) = √(2gR) */
export function escapeVelocityKms(id: BodyId): number {
  const body = BODIES[id]
  return Math.sqrt(2 * body.gravity * body.radiusKm * 1000) / 1000
}

/** 대상 천체에 닿을 때 속도: 무한 원점 속도와 탈출 속도를 더함 */
export function impactSpeedKms(kind: ImpactorKind, target: BodyId): number {
  const vInf = IMPACTOR_KINDS[kind].speedKms
  const vEsc = escapeVelocityKms(target)
  return Math.sqrt(vInf * vInf + vEsc * vEsc)
}

const MEGATON_J = 4.184e15

export function impactEnergyMt(massKg: number, speedKms: number): number {
  const v = speedKms * 1000
  return (0.5 * massKg * v * v) / MEGATON_J
}

/** 두꺼운 대기에서 땅에 닿기 전에 터지는지 */
export function isAirburst(
  target: BodyId,
  kind: ImpactorKind,
  diameterM: number,
): boolean {
  const limits: Partial<Record<BodyId, Record<ImpactorKind, number>>> = {
    // 퉁구스카(1908, 지름 약 50~60m 암석질)는 공중 폭발
    earth: { stony: 60, iron: 10, comet: 100 },
    venus: { stony: 150, iron: 50, comet: 300 },
    titan: { stony: 100, iron: 30, comet: 200 },
  }
  const limit = limits[target]?.[kind]
  return limit !== undefined && diameterM < limit
}

/**
 * 최종 크레이터 지름 (km). π-스케일링(Collins et al. 2005, 45° 충돌) 단순화.
 * 단순 크레이터는 일시 크레이터의 1.25배, 복합 크레이터는 경계 지름에 따라 넓어짐
 */
export function craterDiameterKm(
  target: BodyId,
  kind: ImpactorKind,
  diameterM: number,
): number {
  const body = BODIES[target]
  const rhoI = IMPACTOR_KINDS[kind].density
  const rhoT = ICY.has(target) ? 1000 : 2500
  const v = impactSpeedKms(kind, target) * 1000
  const g = body.gravity
  const transient =
    1.161 *
    (rhoI / rhoT) ** (1 / 3) *
    diameterM ** 0.78 *
    v ** 0.44 *
    g ** -0.22 *
    Math.SQRT1_2 ** (1 / 3)
  const simpleLimit = 3200 * (9.81 / g)
  const final =
    1.25 * transient < simpleLimit
      ? 1.25 * transient
      : (1.17 * transient ** 1.13) / simpleLimit ** 0.13
  return Math.min(final / 1000, body.radiusKm * 2)
}

/** 가스 행성 대기에 남는 검은 흔적 지름 (슈메이커-레비 9 G 조각 약 600만 Mt → 1만 2천 km) */
export const scarDiameterKm = (energyMt: number) =>
  12_000 * (energyMt / 6e6) ** (1 / 3)

/** 폭풍 반경 (km) ≈ 4.4 × ∛메가톤, 열복사 반경은 그 2.2배 */
export const blastRadiusKm = (energyMt: number) => 4.4 * Math.cbrt(energyMt)

export type Severity = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

export const SEVERITY_TEXT: Record<Severity, Text> = {
  0: both(
    '대기에서 타 버림 (밝은 불덩이)',
    'Burns up in the air (bright fireball)',
  ),
  1: both(
    '공중 폭발 — 유리창이 깨지고 다치는 사람이 생김',
    'Airburst — broken windows and injuries',
  ),
  2: both('국지 피해 — 도시 하나 규모', 'Local damage — a city'),
  3: both('지역 재난', 'Regional disaster'),
  4: both('대륙 규모 재난', 'Continental disaster'),
  5: both('전 지구 재난 — 충돌 겨울', 'Global disaster — impact winter'),
  6: both('문명 붕괴 위기', 'Threat to civilisation'),
  7: both('대멸종', 'Mass extinction'),
}

/** 지구 기준 피해 단계 */
export function severity(energyMt: number, airburst: boolean): Severity {
  if (airburst) return energyMt < 0.1 ? 0 : energyMt < 5 ? 1 : 2
  if (energyMt < 10) return 2
  if (energyMt < 1000) return 3
  if (energyMt < 1e5) return 4
  if (energyMt < 1e6) return 5
  if (energyMt < 5e7) return 6
  return 7
}

/** 단계별 사망 비율 (인구 대비, 기근 포함 대략값) */
export const FATALITY_FRACTION: Record<Severity, number> = {
  0: 0,
  1: 0,
  2: 2e-6,
  3: 1e-4,
  4: 2e-3,
  5: 0.03,
  6: 0.25,
  7: 0.9,
}

/** 단계별 생물 다양성 지수 감소 */
export const BIOSPHERE_LOSS: Record<Severity, number> = {
  0: 0,
  1: 0,
  2: 0,
  3: 0,
  4: 1,
  5: 5,
  6: 20,
  7: 70,
}

/** 충돌 겨울로 내려가는 기온 (°C, 음수). 약 300m(3만 Mt)부터 */
export function impactCooling(energyMt: number): number {
  if (energyMt < 10 ** 4.5) return 0
  return -Math.min(15, (8 * (Math.log10(energyMt) - 4.5)) / 3.5)
}

/* ── 궤도 편향 ───────────────────────────────────────────── */

export type DeflectMethod = 'kinetic' | 'tractor' | 'nuclear'

export const DEFLECT_METHODS: Record<
  DeflectMethod,
  { costB: number; travelYears: number; name: Text; note: Text }
> = {
  kinetic: {
    costB: 1,
    travelYears: 1,
    name: both('운동 충돌체', 'Kinetic impactor'),
    note: both(
      '5톤 탐사선을 초속 10km로 부딪쳐 밀어냄 (DART 방식, 운동량 증폭 β=3)',
      'Rams a 5 t spacecraft at 10 km/s (DART-style, momentum boost β = 3)',
    ),
  },
  tractor: {
    costB: 1.5,
    travelYears: 1.5,
    name: both('중력 견인선', 'Gravity tractor'),
    note: both(
      '20톤 탐사선이 옆에 머물며 중력으로 천천히 끌어당김. 수십 년이 필요',
      'A 20 t craft hovers alongside and tugs with gravity — needs decades',
    ),
  },
  nuclear: {
    costB: 5,
    travelYears: 2,
    name: both('핵폭발 편향', 'Nuclear standoff'),
    note: both(
      '1메가톤 장치를 표면 위에서 터뜨려 증발한 물질의 반동으로 밀어냄 (국제 승인 포함 2년)',
      'Detonates 1 Mt above the surface; vaporised material pushes it (2 years incl. approval)',
    ),
  },
}

const SECONDS_PER_YEAR = 3.15576e7
const G = 6.674e-11

/** 공전 방향으로 밀면 1년 넘게 기다릴수록 어긋남이 최대 3배로 커짐 */
const leverage = (leadYears: number) => 1 + 2 * Math.min(1, leadYears)

/**
 * 편향 임무 하나가 만드는 빗나감 거리 (km)
 * @param leadYears 탐사선이 닿은 뒤 충돌까지 남은 시간
 */
export function deflectionKm(
  method: DeflectMethod,
  count: number,
  impactor: { kind: ImpactorKind; diameterM: number },
  leadYears: number,
): number {
  if (leadYears <= 0) return 0
  const mass = impactorMassKg(
    impactor.diameterM,
    IMPACTOR_KINDS[impactor.kind].density,
  )
  const t = leadYears * SECONDS_PER_YEAR
  switch (method) {
    case 'kinetic': {
      const beta = impactor.kind === 'comet' ? 2 : 3
      const dv = (beta * 5000 * 10_000 * count) / mass
      return (dv * t * leverage(leadYears)) / 1000
    }
    case 'tractor': {
      const d = impactor.diameterM / 2 + 150
      const accel = (0.5 * G * 20_000 * count) / (d * d)
      return (0.5 * accel * t * t * leverage(leadYears)) / 1000
    }
    case 'nuclear': {
      const dv = Math.min(1, 0.05 * (300 / impactor.diameterM) ** 2) * count
      return (dv * t * leverage(leadYears)) / 1000
    }
  }
}

/** 비켜 가려면 필요한 빗나감 거리 (km): 중력 초점을 더한 포획 반지름 × 1.1 */
export function requiredMissKm(target: BodyId, kind: ImpactorKind): number {
  const vInf = IMPACTOR_KINDS[kind].speedKms
  const vEsc = escapeVelocityKms(target)
  return BODIES[target].radiusKm * Math.sqrt(1 + (vEsc / vInf) ** 2) * 1.1
}

export interface ImpactOutcome {
  massKg: number
  speedKms: number
  energyMt: number
  airburst: boolean
  /** 고체 표면이면 크레이터 지름 (km) */
  craterKm: number | null
  /** 가스 행성이면 대기 흔적 지름 (km) */
  scarKm: number | null
  severity: Severity
  coolingC: number
}

/** 충돌 결과를 미리 계산합니다 */
export function impactOutcome(
  target: BodyId,
  kind: ImpactorKind,
  diameterM: number,
): ImpactOutcome {
  const massKg = impactorMassKg(diameterM, IMPACTOR_KINDS[kind].density)
  const speedKms = impactSpeedKms(kind, target)
  const energyMt = impactEnergyMt(massKg, speedKms)
  const gas = isGasGiant(target)
  const airburst = !gas && isAirburst(target, kind, diameterM)
  return {
    massKg,
    speedKms,
    energyMt,
    airburst,
    craterKm:
      gas || airburst ? null : craterDiameterKm(target, kind, diameterM),
    scarKm: gas ? scarDiameterKm(energyMt) : null,
    severity: severity(energyMt, airburst),
    coolingC: target === 'earth' ? impactCooling(energyMt) : 0,
  }
}
