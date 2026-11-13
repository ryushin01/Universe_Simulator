import { both } from '@/shared/i18n'
import type { Text } from '@/shared/i18n'

export type GalaxyType = 'spiral' | 'elliptical' | 'irregular' | 'dwarf'

export interface LocalGalaxy {
  id: string
  name: Text
  type: GalaxyType
  ra: number
  dec: number
  distanceLy: number
  /** 지름 (광년) */
  diameterLy: number
  note: Text
}

/** 국부 은하군의 주요 은하 (거리·크기는 대략값) */
export const LOCAL_GALAXIES: LocalGalaxy[] = [
  {
    id: 'milky-way',
    name: both('우리 은하', 'Milky Way'),
    type: 'spiral',
    ra: 266.41683,
    dec: -29.00781,
    distanceLy: 26_670,
    diameterLy: 100_000,
    note: both(
      '별 1천억~4천억 개의 막대 나선 은하. 암흑 물질을 합친 질량은 태양의 약 1조 배입니다.',
      'A barred spiral of 100–400 billion stars; with dark matter it weighs about a trillion Suns.',
    ),
  },
  {
    id: 'andromeda',
    name: both('안드로메다 은하 (M31)', 'Andromeda Galaxy (M31)'),
    type: 'spiral',
    ra: 10.685,
    dec: 41.269,
    distanceLy: 2_537_000,
    diameterLy: 152_000,
    note: both(
      '초속 약 110km로 다가오는 가장 가까운 큰 은하. 약 45억 년 뒤 가까이 스칠 수 있고, 100억 년 안에 합쳐질 확률은 약 50%로 봅니다(2025년 연구).',
      'The nearest large galaxy, approaching at ~110 km/s. A close pass may come in ~4.5 billion years; a merger within 10 billion years has roughly even odds (2025 study).',
    ),
  },
  {
    id: 'triangulum',
    name: both('삼각형자리 은하 (M33)', 'Triangulum Galaxy (M33)'),
    type: 'spiral',
    ra: 23.462,
    dec: 30.66,
    distanceLy: 2_730_000,
    diameterLy: 61_000,
    note: both(
      '국부 은하군에서 세 번째로 큰 나선 은하입니다.',
      'The third-largest spiral in the Local Group.',
    ),
  },
  {
    id: 'lmc',
    name: both('대마젤란 은하', 'Large Magellanic Cloud'),
    type: 'irregular',
    ra: 80.894,
    dec: -69.756,
    distanceLy: 160_000,
    diameterLy: 32_000,
    note: both(
      '우리 은하의 가장 큰 위성 은하로, 약 20억 년 뒤 우리 은하와 충돌할 수 있습니다.',
      'Our largest satellite; it may collide with the Milky Way in ~2 billion years.',
    ),
  },
  {
    id: 'smc',
    name: both('소마젤란 은하', 'Small Magellanic Cloud'),
    type: 'irregular',
    ra: 13.187,
    dec: -72.829,
    distanceLy: 200_000,
    diameterLy: 19_000,
    note: both(
      '대마젤란 은하와 함께 우리 은하를 돕니다.',
      'Orbits the Galaxy together with the Large Cloud.',
    ),
  },
  {
    id: 'm32',
    name: both('M32', 'M32'),
    type: 'elliptical',
    ra: 10.674,
    dec: 40.865,
    distanceLy: 2_490_000,
    diameterLy: 6500,
    note: both(
      '안드로메다의 작고 빽빽한 타원 위성 은하입니다.',
      'A compact elliptical satellite of Andromeda.',
    ),
  },
  {
    id: 'm110',
    name: both('M110', 'M110'),
    type: 'elliptical',
    ra: 10.092,
    dec: 41.685,
    distanceLy: 2_690_000,
    diameterLy: 17_000,
    note: both(
      '안드로메다의 왜소 타원 은하입니다.',
      'A dwarf elliptical companion of Andromeda.',
    ),
  },
  {
    id: 'ngc185',
    name: both('NGC 185', 'NGC 185'),
    type: 'dwarf',
    ra: 9.742,
    dec: 48.337,
    distanceLy: 2_050_000,
    diameterLy: 8000,
    note: both(
      '안드로메다의 왜소 구형 은하입니다.',
      'A dwarf spheroidal satellite of Andromeda.',
    ),
  },
  {
    id: 'ngc147',
    name: both('NGC 147', 'NGC 147'),
    type: 'dwarf',
    ra: 8.3,
    dec: 48.509,
    distanceLy: 2_530_000,
    diameterLy: 10_000,
    note: both(
      '안드로메다 둘레의 왜소 은하입니다.',
      'A dwarf galaxy around Andromeda.',
    ),
  },
  {
    id: 'ngc6822',
    name: both('바너드 은하 (NGC 6822)', 'Barnard’s Galaxy (NGC 6822)'),
    type: 'irregular',
    ra: 296.24,
    dec: -14.803,
    distanceLy: 1_630_000,
    diameterLy: 7000,
    note: both(
      '별 탄생이 활발한 불규칙 은하입니다.',
      'A star-forming irregular galaxy.',
    ),
  },
  {
    id: 'ic1613',
    name: both('IC 1613', 'IC 1613'),
    type: 'irregular',
    ra: 16.199,
    dec: 2.118,
    distanceLy: 2_380_000,
    diameterLy: 10_000,
    note: both(
      '먼지가 거의 없어 별을 또렷이 볼 수 있는 왜소 불규칙 은하입니다.',
      'A nearly dust-free dwarf irregular galaxy.',
    ),
  },
  {
    id: 'ic10',
    name: both('IC 10', 'IC 10'),
    type: 'irregular',
    ra: 5.072,
    dec: 59.304,
    distanceLy: 2_200_000,
    diameterLy: 5000,
    note: both(
      '국부 은하군에서 별이 가장 활발히 태어나는 폭발적 항성 생성 은하입니다.',
      'The Local Group’s only starburst galaxy.',
    ),
  },
  {
    id: 'wlm',
    name: both('WLM', 'WLM'),
    type: 'irregular',
    ra: 0.492,
    dec: -15.461,
    distanceLy: 3_040_000,
    diameterLy: 8000,
    note: both(
      '국부 은하군 가장자리의 외딴 왜소 은하입니다.',
      'An isolated dwarf at the Local Group’s edge.',
    ),
  },
  {
    id: 'leo-a',
    name: both('사자자리 A', 'Leo A'),
    type: 'irregular',
    ra: 149.86,
    dec: 30.746,
    distanceLy: 2_600_000,
    diameterLy: 4000,
    note: both(
      '늦게 별을 만들기 시작한 젊은 왜소 은하입니다.',
      'A dwarf that began forming stars late.',
    ),
  },
  {
    id: 'sagittarius-dsph',
    name: both('궁수자리 왜소 은하', 'Sagittarius Dwarf'),
    type: 'dwarf',
    ra: 283.764,
    dec: -30.48,
    distanceLy: 70_000,
    diameterLy: 10_000,
    note: both(
      '우리 은하의 조석력에 길게 찢겨 흡수되는 중입니다.',
      'Being shredded and absorbed by the Milky Way’s tides.',
    ),
  },
  {
    id: 'fornax',
    name: both('화로자리 왜소 은하', 'Fornax Dwarf'),
    type: 'dwarf',
    ra: 39.997,
    dec: -34.449,
    distanceLy: 460_000,
    diameterLy: 6000,
    note: both(
      '구상 성단 여섯 개를 거느린 왜소 구형 은하입니다.',
      'A dwarf spheroidal with six globular clusters.',
    ),
  },
  {
    id: 'sculptor',
    name: both('조각가자리 왜소 은하', 'Sculptor Dwarf'),
    type: 'dwarf',
    ra: 15.039,
    dec: -33.709,
    distanceLy: 290_000,
    diameterLy: 3000,
    note: both(
      '처음 발견된 왜소 구형 은하입니다 (1937).',
      'The first dwarf spheroidal discovered (1937).',
    ),
  },
  {
    id: 'leo-i',
    name: both('사자자리 I', 'Leo I'),
    type: 'dwarf',
    ra: 152.117,
    dec: 12.307,
    distanceLy: 820_000,
    diameterLy: 2000,
    note: both(
      '밝은 별 레굴루스 바로 옆에 있어 찾기 어렵습니다.',
      'Hidden in the glare of nearby Regulus.',
    ),
  },
  {
    id: 'draco',
    name: both('용자리 왜소 은하', 'Draco Dwarf'),
    type: 'dwarf',
    ra: 260.052,
    dec: 57.915,
    distanceLy: 260_000,
    diameterLy: 2700,
    note: both(
      '암흑 물질이 아주 많은 은하로 꼽힙니다.',
      'One of the most dark-matter-dominated galaxies known.',
    ),
  },
  {
    id: 'phoenix',
    name: both('불사조자리 왜소 은하', 'Phoenix Dwarf'),
    type: 'dwarf',
    ra: 27.776,
    dec: -44.445,
    distanceLy: 1_440_000,
    diameterLy: 2000,
    note: both(
      '구형 은하와 불규칙 은하의 중간 모습입니다.',
      'A transition between spheroidal and irregular dwarfs.',
    ),
  },
]

export const LOCAL_GALAXY_BY_ID = Object.fromEntries(
  LOCAL_GALAXIES.map((g) => [g.id, g]),
) as Record<string, LocalGalaxy>

export const GALAXY_TYPE_NAME: Record<GalaxyType, Text> = {
  spiral: both('나선 은하', 'Spiral galaxy'),
  elliptical: both('타원 은하', 'Elliptical galaxy'),
  irregular: both('불규칙 은하', 'Irregular galaxy'),
  dwarf: both('왜소 은하', 'Dwarf galaxy'),
}
