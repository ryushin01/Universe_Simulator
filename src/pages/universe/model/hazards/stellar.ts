import { both } from '@/shared/i18n'
import type { Text } from '@/shared/i18n'
import { clamp } from '@/shared/lib'

/** 고에너지 천체 현상 */
export type BlastKind = 'supernova' | 'grb' | 'kilonova' | 'magnetar'

export interface BlastSource {
  id: string
  kind: BlastKind
  name: Text
  distanceLy: number
  /** 적경·적위 (도) */
  ra: number
  dec: number
  /** 초신성 형식 */
  snType?: 'II' | 'Ia'
  /** 실제 천체 */
  real: boolean
  note: Text
}

export const BLAST_SOURCES: BlastSource[] = [
  {
    id: 'betelgeuse',
    kind: 'supernova',
    snType: 'II',
    name: both('베텔게우스', 'Betelgeuse'),
    distanceLy: 548,
    ra: 88.793,
    dec: 7.407,
    real: true,
    note: both(
      '오리온자리 어깨의 적색 초거성. 10만 년 안에 터질 것으로 보지만 정확한 때는 모릅니다.',
      'The red supergiant on Orion’s shoulder; expected within ~100,000 years, exact timing unknown.',
    ),
  },
  {
    id: 'antares',
    kind: 'supernova',
    snType: 'II',
    name: both('안타레스', 'Antares'),
    distanceLy: 550,
    ra: 247.352,
    dec: -26.432,
    real: true,
    note: both(
      '전갈자리의 붉은 심장인 적색 초거성입니다.',
      'The red-supergiant heart of Scorpius.',
    ),
  },
  {
    id: 'spica',
    kind: 'supernova',
    snType: 'II',
    name: both('스피카', 'Spica'),
    distanceLy: 250,
    ra: 201.298,
    dec: -11.161,
    real: true,
    note: both(
      '처녀자리의 무거운 쌍성. 주성이 언젠가 초신성이 될 만큼 무겁습니다.',
      'A massive binary in Virgo; its primary is heavy enough to end as a supernova.',
    ),
  },
  {
    id: 'ik-pegasi',
    kind: 'supernova',
    snType: 'Ia',
    name: both('페가수스자리 IK', 'IK Pegasi'),
    distanceLy: 154,
    ra: 321.611,
    dec: 19.376,
    real: true,
    note: both(
      '가장 가까운 Ia형 초신성 후보. 백색 왜성 동반성이 질량을 얻으면 폭발할 수 있습니다.',
      'The nearest type Ia candidate: its white-dwarf companion could explode after gaining mass.',
    ),
  },
  {
    id: 'near-50',
    kind: 'supernova',
    snType: 'II',
    name: both('가상의 별 (50광년)', 'Hypothetical star (50 ly)'),
    distanceLy: 50,
    ra: 120,
    dec: -20,
    real: false,
    note: both(
      '지금 50광년 안에는 초신성이 될 별이 없습니다. 가정한 경우입니다.',
      'No supernova progenitor exists within 50 ly today; this is hypothetical.',
    ),
  },
  {
    id: 'near-25',
    kind: 'supernova',
    snType: 'II',
    name: both('가상의 별 (25광년)', 'Hypothetical star (25 ly)'),
    distanceLy: 25,
    ra: 60,
    dec: 30,
    real: false,
    note: both(
      '오존층 절반가량이 파괴되는 거리입니다 (Gehrels et al. 2003).',
      'Close enough to destroy about half the ozone layer (Gehrels et al. 2003).',
    ),
  },
  {
    id: 'near-10',
    kind: 'supernova',
    snType: 'II',
    name: both('가상의 별 (10광년)', 'Hypothetical star (10 ly)'),
    distanceLy: 10,
    ra: 300,
    dec: 10,
    real: false,
    note: both(
      '대멸종을 부를 수 있는 거리입니다. 잔해는 수백 년 뒤 태양계에 닿습니다.',
      'Close enough to cause a mass extinction; its debris reaches us centuries later.',
    ),
  },
  {
    id: 'wr104',
    kind: 'grb',
    name: both('울프-레이에 104', 'WR 104'),
    distanceLy: 8000,
    ra: 270.517,
    dec: -23.628,
    real: true,
    note: both(
      '감마선 폭발 후보로 거론되는 별. 제트가 지구를 향할지는 불확실해, 여기서는 지구를 향한다고 가정합니다.',
      'A proposed gamma-ray-burst candidate. Whether its jet would point at us is uncertain; here we assume it does.',
    ),
  },
  {
    id: 'grb-6500',
    kind: 'grb',
    name: both('가상 감마선 폭발 (6,500광년)', 'Hypothetical GRB (6,500 ly)'),
    distanceLy: 6500,
    ra: 210,
    dec: -40,
    real: false,
    note: both(
      '지구를 향한 폭발이면 오존층의 약 3분의 1이 사라집니다 (Thomas et al. 2005). 오르도비스기 대멸종의 원인 후보로도 거론됩니다.',
      'If beamed at Earth, about a third of the ozone layer is lost (Thomas et al. 2005) — a proposed cause of the Ordovician extinction.',
    ),
  },
  {
    id: 'grb-1000',
    kind: 'grb',
    name: both('가상 감마선 폭발 (1,000광년)', 'Hypothetical GRB (1,000 ly)'),
    distanceLy: 1000,
    ra: 30,
    dec: 50,
    real: false,
    note: both(
      '오존층 대부분이 사라지는 거리입니다.',
      'Close enough to strip most of the ozone layer.',
    ),
  },
  {
    id: 'kilonova-30',
    kind: 'kilonova',
    name: both('가상 킬로노바 (30광년)', 'Hypothetical kilonova (30 ly)'),
    distanceLy: 30,
    ra: 160,
    dec: 5,
    real: false,
    note: both(
      '중성자별 두 개가 합쳐지는 폭발. 금·백금 같은 무거운 원소를 만들고 중력파를 냅니다. 약 36광년 안이면 우주선이 위험합니다 (Perkins et al. 2024).',
      'Two neutron stars merging: forges gold and platinum and emits gravitational waves. Within ~36 ly its cosmic rays are dangerous (Perkins et al. 2024).',
    ),
  },
  {
    id: 'sgr1806',
    kind: 'magnetar',
    name: both('SGR 1806−20', 'SGR 1806−20'),
    distanceLy: 28_000,
    ra: 272.164,
    dec: -20.411,
    real: true,
    note: both(
      '2004년 12월 27일 거대 플레어를 낸 마그네타. 태양계 밖에서 온 가장 밝은 섬광으로 지구 전리층을 흔들었습니다.',
      'This magnetar’s giant flare on 27 Dec 2004 was the brightest flash ever seen from beyond the Solar System, jolting Earth’s ionosphere.',
    ),
  },
  {
    id: 'magnetar-10',
    kind: 'magnetar',
    name: both('가상 마그네타 (10광년)', 'Hypothetical magnetar (10 ly)'),
    distanceLy: 10,
    ra: 240,
    dec: -60,
    real: false,
    note: both(
      '가까운 거대 플레어는 오존층을 크게 깎습니다.',
      'A nearby giant flare would badly erode the ozone layer.',
    ),
  },
]

export const BLAST_KIND_NAME: Record<BlastKind, Text> = {
  supernova: both('초신성', 'Supernova'),
  grb: both('감마선 폭발', 'Gamma-ray burst'),
  kilonova: both('킬로노바', 'Kilonova'),
  magnetar: both('마그네타 거대 플레어', 'Magnetar giant flare'),
}

const LY_PER_PC = 3.26156

/** 최대 밝기의 절대 등급 */
function peakAbsoluteMagnitude(source: BlastSource): number | null {
  if (source.kind === 'supernova') return source.snType === 'Ia' ? -19.3 : -17
  if (source.kind === 'kilonova') return -16
  return null
}

/** 지구에서 본 가장 밝을 때의 겉보기 등급 */
export function peakApparentMagnitude(source: BlastSource): number | null {
  const absolute = peakAbsoluteMagnitude(source)
  if (absolute === null) return null
  const pc = source.distanceLy / LY_PER_PC
  return absolute + 5 * Math.log10(pc) - 5
}

/** 지구 오존층이 줄어드는 비율 (0~0.95). 거리에 따른 대략값 */
export function ozoneLoss(source: BlastSource): number {
  const d = source.distanceLy
  switch (source.kind) {
    case 'supernova': {
      const reference = source.snType === 'Ia' ? 33 : 26
      return clamp(0.47 * (reference / d) ** 1.3, 0, 0.95)
    }
    case 'grb':
      return clamp(0.35 * (6500 / d) ** 0.8, 0, 0.95)
    case 'kilonova':
      return clamp(0.5 * (36 / d) ** 1.3, 0, 0.95)
    case 'magnetar':
      return clamp(0.3 * (10 / d) ** 2, 0, 0.95)
  }
}

/** 잔해(초속 5,000km)가 태양계에 닿는 데 걸리는 해 */
export const debrisArrivalYears = (distanceLy: number) =>
  distanceLy / (5000 / 299_792)

/** 오존 감소에 따른 인구 피해 비율 (자외선 증가로 농업 피해) */
export const ozoneFatality = (loss: number) => Math.max(0, loss - 0.3) * 0.4

/** 오존 감소에 따른 생물 다양성 지수 감소 */
export const ozoneBiosphereLoss = (loss: number) => Math.max(0, loss - 0.3) * 80

/** 밝기 설명 (보름달 −12.7등급, 금성 −4.6등급) */
export function brightnessKey(
  magnitude: number | null,
): 'flash' | 'brighterThanMoon' | 'daylight' | 'bright' | 'faint' {
  if (magnitude === null) return 'flash'
  if (magnitude < -12.7) return 'brighterThanMoon'
  if (magnitude < -4) return 'daylight'
  if (magnitude < 1) return 'bright'
  return 'faint'
}
