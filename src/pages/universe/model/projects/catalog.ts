import { both } from '@/shared/i18n'
import type { Text } from '@/shared/i18n'
import type { BodyId } from '../solar/bodies'

export type ProjectKind =
  | 'defense-net'
  | 'sentinel'
  | 'grid-shield'
  | 'space-elevator'
  | 'moon-base'
  | 'mars-shield'
  | 'mars-city'
  | 'terraform-mars'
  | 'titan-base'
  | 'oneill'
  | 'sunshade'
  | 'orbit-engine'
  | 'dyson-swarm'
  | 'dyson-sphere'
  | 'ringworld'
  | 'stellar-engine'

export type ProjectCategory = 'defense' | 'habitat' | 'climate' | 'mega'

export interface ProjectSpec {
  kind: ProjectKind
  name: Text
  /** 짓는 곳 */
  site: Text
  /** 3D 장면에서 붙어 있는 천체 */
  anchor: BodyId
  costB: number
  buildYears: number
  requires?: ProjectKind[]
  category: ProjectCategory
  /** SF에 자주 나오는 거대 구조물 */
  sf?: boolean
  /** 살 수 있는 사람 수 */
  population?: number
  effect: Text
}

export const PROJECTS: ProjectSpec[] = [
  {
    kind: 'defense-net',
    name: both('행성 방위 요격망', 'Planetary defence network'),
    site: both('지구 궤도', 'Earth orbit'),
    anchor: 'earth',
    costB: 60,
    buildYears: 6,
    category: 'defense',
    effect: both(
      '지구로 오는 천체를 1년 넘게 앞서 찾으면 운동 충돌체 10기를 자동으로 보냅니다.',
      'Automatically sends ten kinetic impactors at any Earth-bound object found more than a year ahead.',
    ),
  },
  {
    kind: 'sentinel',
    name: both('우주 기상 경보 위성', 'Space-weather sentinel'),
    site: both('태양–지구 L1', 'Sun–Earth L1'),
    anchor: 'earth',
    costB: 5,
    buildYears: 3,
    category: 'defense',
    effect: both(
      '태양 폭풍을 미리 알려 변압기를 끊을 시간을 벌어 지구 피해를 절반으로 줄입니다.',
      'Early warning lets grids disconnect transformers, halving storm damage on Earth.',
    ),
  },
  {
    kind: 'grid-shield',
    name: both('전력망 보호 장치', 'Grid hardening'),
    site: both('지구', 'Earth'),
    anchor: 'earth',
    costB: 180,
    buildYears: 4,
    category: 'defense',
    effect: both(
      '변압기 중성점 차단기와 예비 변압기로 태양 폭풍 피해를 80% 줄입니다.',
      'Neutral blockers and spare transformers cut storm damage by 80%.',
    ),
  },
  {
    kind: 'space-elevator',
    name: both('우주 엘리베이터', 'Space elevator'),
    site: both('지구 적도', 'Earth’s equator'),
    anchor: 'earth',
    costB: 500,
    buildYears: 20,
    category: 'mega',
    sf: true,
    effect: both(
      '정지 궤도 너머까지 뻗은 케이블로 화물을 올려, 이후 짓는 구조물 비용을 25% 줄입니다.',
      'A cable past geostationary orbit lifts cargo cheaply: later projects cost 25% less.',
    ),
  },
  {
    kind: 'moon-base',
    name: both('달 기지', 'Lunar base'),
    site: both('달 남극', 'Lunar south pole'),
    anchor: 'moon',
    costB: 150,
    buildYears: 10,
    category: 'habitat',
    population: 10_000,
    effect: both(
      '영구 그늘 크레이터의 얼음을 쓰는 기지. 최대 1만 명.',
      'A base using ice from permanently shadowed craters. Up to 10,000 people.',
    ),
  },
  {
    kind: 'mars-shield',
    name: both('화성 자기장 방패', 'Mars magnetic shield'),
    site: both('태양–화성 L1', 'Sun–Mars L1'),
    anchor: 'mars',
    costB: 500,
    buildYears: 15,
    category: 'climate',
    effect: both(
      '화성 앞에 인공 자기장을 띄워 태양풍을 막습니다. 대기가 쌓이고 극관이 녹아 +4°C, 화성 사람들을 태양 폭풍에서 지킵니다.',
      'An artificial magnetic field shields Mars from the solar wind: the air thickens, polar CO₂ sublimates (+4°C) and colonists are protected from storms.',
    ),
  },
  {
    kind: 'mars-city',
    name: both('화성 도시', 'Mars city'),
    site: both('화성 헬라스 분지', 'Hellas Basin, Mars'),
    anchor: 'mars',
    costB: 1500,
    buildYears: 25,
    category: 'habitat',
    population: 1_000_000,
    effect: both(
      '기압이 가장 높은 분지에 세운 도시. 최대 100만 명.',
      'A city in the deepest, highest-pressure basin. Up to one million people.',
    ),
  },
  {
    kind: 'terraform-mars',
    name: both('화성 테라포밍', 'Terraforming Mars'),
    site: both('화성', 'Mars'),
    anchor: 'mars',
    costB: 20_000,
    buildYears: 50,
    requires: ['mars-shield'],
    category: 'climate',
    sf: true,
    effect: both(
      '궤도 거울과 온실가스 공장으로 수백 년에 걸쳐 기온을 최대 +75°C, 기압을 0.8기압까지 올립니다.',
      'Orbital mirrors and greenhouse-gas factories raise temperature by up to +75°C and pressure to 0.8 bar over centuries.',
    ),
  },
  {
    kind: 'titan-base',
    name: both('타이탄 기지', 'Titan base'),
    site: both('타이탄 크라켄 바다 기슭', 'Shore of Kraken Mare, Titan'),
    anchor: 'titan',
    costB: 3000,
    buildYears: 30,
    category: 'habitat',
    population: 50_000,
    effect: both(
      '두꺼운 대기가 방사선을 막아 주는 바깥 태양계의 기지. 최대 5만 명.',
      'An outer-system base under a radiation-blocking atmosphere. Up to 50,000 people.',
    ),
  },
  {
    kind: 'oneill',
    name: both('오닐 실린더', 'O’Neill cylinder'),
    site: both('지구–달 L5', 'Earth–Moon L5'),
    anchor: 'earth',
    costB: 8000,
    buildYears: 30,
    category: 'habitat',
    sf: true,
    population: 10_000_000,
    effect: both(
      '지름 8km, 길이 32km의 원통 두 개가 서로 반대로 돌며 인공 중력을 만듭니다. 최대 1천만 명.',
      'Two counter-rotating cylinders, 8 km wide and 32 km long, spin up artificial gravity. Up to ten million people.',
    ),
  },
  {
    kind: 'sunshade',
    name: both('L1 우주 차양', 'L1 sunshade'),
    site: both('태양–지구 L1', 'Sun–Earth L1'),
    anchor: 'earth',
    costB: 4000,
    buildYears: 30,
    category: 'climate',
    effect: both(
      '얇은 막 수조 장으로 지구에 오는 햇빛을 2% 가립니다. 태양이 밝아지는 약 2억 년을 늦춥니다.',
      'Trillions of thin films block 2% of sunlight, offsetting about 200 million years of solar brightening.',
    ),
  },
  {
    kind: 'orbit-engine',
    name: both('지구 궤도 이동', 'Earth orbit migration'),
    site: both('지구 궤도', 'Earth orbit'),
    anchor: 'earth',
    costB: 50_000,
    buildYears: 100,
    category: 'climate',
    sf: true,
    effect: both(
      '카이퍼 벨트 천체를 끌어와 지구 곁을 수천 년마다 스치게 해(Korycansky 2001), 태양이 밝아지는 만큼 지구 궤도를 넓힙니다.',
      'Steers a Kuiper Belt object past Earth every few thousand years (Korycansky 2001), widening Earth’s orbit as the Sun brightens.',
    ),
  },
  {
    kind: 'dyson-swarm',
    name: both('다이슨 스웜', 'Dyson swarm'),
    site: both('태양 둘레 0.5 AU', '0.5 AU around the Sun'),
    anchor: 'sun',
    costB: 200_000,
    buildYears: 200,
    category: 'mega',
    sf: true,
    effect: both(
      '수많은 태양광 위성이 태양빛의 1%를 모아 문명 에너지를 수십억 배로 늘립니다 (카르다쇼프 척도 약 1.9).',
      'A cloud of solar collectors captures 1% of sunlight, multiplying civilisation’s power billions of times (Kardashev ≈ 1.9).',
    ),
  },
  {
    kind: 'dyson-sphere',
    name: both('다이슨 구', 'Dyson sphere'),
    site: both('태양 둘레 2 AU 껍질', 'Shell at 2 AU'),
    anchor: 'sun',
    costB: 5e7,
    buildYears: 2000,
    requires: ['dyson-swarm'],
    category: 'mega',
    sf: true,
    effect: both(
      '태양빛을 모두 모으는 껍질 (카르다쇼프 2단계). 화성까지는 껍질 안쪽이라 그대로지만, 껍질 바깥의 세레스·목성부터는 햇빛이 닿지 않습니다.',
      'A shell that captures all sunlight (Kardashev Type II). Mars stays inside it, but worlds beyond — from Ceres and Jupiter outward — go dark.',
    ),
  },
  {
    kind: 'ringworld',
    name: both('고리 세계 (링월드)', 'Ringworld'),
    site: both('태양 둘레 1.2 AU', '1.2 AU around the Sun'),
    anchor: 'sun',
    costB: 1e9,
    buildYears: 10_000,
    requires: ['dyson-swarm'],
    category: 'habitat',
    sf: true,
    population: 3e12,
    effect: both(
      '폭 160만 km의 고리 안쪽 면에 지구 표면적의 수백만 배 땅을 펼칩니다. 최대 3조 명.',
      'A 1.6-million-km-wide ribbon whose inner face holds millions of Earths of land. Up to three trillion people.',
    ),
  },
  {
    kind: 'stellar-engine',
    name: both('항성 엔진', 'Stellar engine'),
    site: both(
      '태양 한쪽 (슈카도프 추진기)',
      'One side of the Sun (Shkadov thruster)',
    ),
    anchor: 'sun',
    costB: 1e8,
    buildYears: 5000,
    requires: ['dyson-swarm'],
    category: 'mega',
    sf: true,
    effect: both(
      '거대한 거울로 태양빛을 한쪽으로 반사해 태양계 전체를 천천히 밀어, 다가오는 별을 더 멀리 지나가게 합니다.',
      'A vast mirror reflects sunlight to one side, slowly pushing the whole Solar System so approaching stars pass farther away.',
    ),
  },
]

export const PROJECT_BY_KIND = Object.fromEntries(
  PROJECTS.map((p) => [p.kind, p]),
) as Record<ProjectKind, ProjectSpec>

export const CATEGORY_NAME: Record<ProjectCategory, Text> = {
  defense: both('방어', 'Defence'),
  habitat: both('거주', 'Habitats'),
  climate: both('기후·궤도', 'Climate & orbit'),
  mega: both('거대 구조물', 'Megastructures'),
}

/** 우주 엘리베이터가 있으면 이후 비용 25% 절감 */
export const ELEVATOR_DISCOUNT = 0.75
