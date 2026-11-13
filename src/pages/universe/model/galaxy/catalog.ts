import { both } from '@/shared/i18n'
import type { Text } from '@/shared/i18n'

export type GalaxyObjectKind =
  | 'sun'
  | 'blackHole'
  | 'nebula'
  | 'remnant'
  | 'star'
  | 'cluster'
  | 'satellite'
  | 'magnetar'
  | 'planetarySystem'

export interface GalaxyObject {
  id: string
  name: Text
  kind: GalaxyObjectKind
  /** 적경·적위 (도). 태양은 null */
  ra: number | null
  dec: number | null
  distanceLy: number
  facts: Text
  note: Text
}

/** 우리 은하의 이름난 천체 (거리는 대략값) */
export const GALAXY_OBJECTS: GalaxyObject[] = [
  {
    id: 'sun',
    name: both('태양', 'Sun'),
    kind: 'sun',
    ra: null,
    dec: null,
    distanceLy: 0,
    facts: both(
      '은하 중심에서 약 2만 6천 광년, 은하 1년 약 2억 3천만 년',
      'About 26,000 ly from the centre; one galactic year ≈ 230 million years',
    ),
    note: both(
      '오리온자리 팔(오리온 돌출부)에 있는 평범한 별. 초속 약 230km로 은하 중심을 돌며, 은하면 위아래로도 오르내립니다.',
      'An ordinary star in the Orion Spur, circling the centre at ~230 km/s while bobbing above and below the disc.',
    ),
  },
  {
    id: 'sgr-a',
    name: both('궁수자리 A*', 'Sagittarius A*'),
    kind: 'blackHole',
    ra: 266.41683,
    dec: -29.00781,
    distanceLy: 26_670,
    facts: both('질량 태양의 약 430만 배', 'About 4.3 million solar masses'),
    note: both(
      '은하 중심의 초대질량 블랙홀. 2022년 사건의 지평선 망원경(EHT)이 그림자를 찍었고, 주변 별의 궤도를 밝힌 연구가 2020년 노벨 물리학상을 받았습니다.',
      'The Galaxy’s central supermassive black hole, imaged by the Event Horizon Telescope in 2022; tracking stars around it won the 2020 Nobel Prize.',
    ),
  },
  {
    id: 'orion-nebula',
    name: both('오리온 대성운 (M42)', 'Orion Nebula (M42)'),
    kind: 'nebula',
    ra: 83.822,
    dec: -5.391,
    distanceLy: 1344,
    facts: both(
      '지름 약 24광년, 별 2,000여 개가 태어나는 중',
      '~24 ly across, ~2,000 stars forming',
    ),
    note: both(
      '맨눈으로 보이는 가장 가까운 큰 별 탄생 지역입니다.',
      'The nearest large star-forming region visible to the naked eye.',
    ),
  },
  {
    id: 'pleiades',
    name: both('플레이아데스 (좀생이별)', 'Pleiades'),
    kind: 'cluster',
    ra: 56.75,
    dec: 24.117,
    distanceLy: 444,
    facts: both(
      '나이 약 1억 년의 산개 성단',
      'An open cluster about 100 million years old',
    ),
    note: both(
      '일곱 자매라고도 부르는 파란 별 무리입니다.',
      'The blue “Seven Sisters.”',
    ),
  },
  {
    id: 'crab',
    name: both('게 성운 (M1)', 'Crab Nebula (M1)'),
    kind: 'remnant',
    ra: 83.633,
    dec: 22.0145,
    distanceLy: 6500,
    facts: both(
      '1054년 초신성의 잔해, 가운데에 초당 30번 도는 펄서',
      'Remnant of the 1054 supernova with a 30-times-a-second pulsar',
    ),
    note: both(
      '1054년 동아시아 천문 기록에 남은 객성(손님별)의 잔해입니다.',
      'The remains of a “guest star” recorded by East Asian astronomers in 1054.',
    ),
  },
  {
    id: 'eta-carinae',
    name: both('용골자리 에타', 'Eta Carinae'),
    kind: 'star',
    ra: 161.265,
    dec: -59.685,
    distanceLy: 7500,
    facts: both(
      '태양의 약 100배가 넘는 질량의 쌍성',
      'A binary weighing over ~100 Suns',
    ),
    note: both(
      '1843년 대폭발로 하늘에서 두 번째로 밝아졌던 별. 초신성(극초신성) 후보입니다.',
      'Its 1843 Great Eruption made it the sky’s second-brightest star; a hypernova candidate.',
    ),
  },
  {
    id: 'cygnus-x1',
    name: both('백조자리 X-1', 'Cygnus X-1'),
    kind: 'blackHole',
    ra: 299.59,
    dec: 35.202,
    distanceLy: 7200,
    facts: both('태양 질량의 약 21배인 블랙홀', 'A ~21-solar-mass black hole'),
    note: both(
      '처음으로 널리 인정된 블랙홀. 동반성의 가스를 빨아들이며 X선을 냅니다.',
      'The first widely accepted black hole, glowing in X-rays as it feeds on its companion.',
    ),
  },
  {
    id: 'gaia-bh3',
    name: both('가이아 BH3', 'Gaia BH3'),
    kind: 'blackHole',
    ra: 294.83,
    dec: 14.93,
    distanceLy: 1926,
    facts: both(
      '태양 질량의 약 33배, 2024년 발견',
      '~33 solar masses, found in 2024',
    ),
    note: both(
      '우리 은하에서 찾은 가장 무거운 항성 블랙홀. 빛을 내지 않고 동반성의 흔들림으로 찾았습니다.',
      'The heaviest stellar black hole known in the Galaxy, found from its companion’s wobble.',
    ),
  },
  {
    id: 'sgr1806',
    name: both('SGR 1806−20', 'SGR 1806−20'),
    kind: 'magnetar',
    ra: 272.164,
    dec: -20.411,
    distanceLy: 28_000,
    facts: both(
      '자기장이 지구의 1천조 배인 중성자별',
      'A neutron star with a field a quadrillion times Earth’s',
    ),
    note: both(
      '2004년 거대 플레어가 지구 전리층을 흔들었습니다.',
      'Its 2004 giant flare jolted Earth’s ionosphere.',
    ),
  },
  {
    id: 'wr104',
    name: both('울프-레이에 104', 'WR 104'),
    kind: 'star',
    ra: 270.517,
    dec: -23.628,
    distanceLy: 8000,
    facts: both(
      '먼지가 바람개비처럼 감기는 쌍성',
      'A binary wrapped in a pinwheel of dust',
    ),
    note: both(
      '감마선 폭발 후보로 거론되지만 제트 방향은 불확실합니다.',
      'Discussed as a gamma-ray-burst candidate; its jet direction is uncertain.',
    ),
  },
  {
    id: 'eagle',
    name: both(
      '독수리 성운 (창조의 기둥)',
      'Eagle Nebula (Pillars of Creation)',
    ),
    kind: 'nebula',
    ra: 274.7,
    dec: -13.807,
    distanceLy: 5700,
    facts: both('높이 약 4광년의 가스 기둥', 'Gas pillars about 4 ly tall'),
    note: both(
      '허블과 제임스 웹 사진으로 유명한 별 탄생 지역입니다.',
      'A stellar nursery made famous by Hubble and JWST.',
    ),
  },
  {
    id: 'omega-centauri',
    name: both('오메가 센타우리', 'Omega Centauri'),
    kind: 'cluster',
    ra: 201.697,
    dec: -47.4795,
    distanceLy: 17_090,
    facts: both(
      '별 약 1천만 개의 구상 성단',
      'A globular cluster of ~10 million stars',
    ),
    note: both(
      '우리 은하가 삼킨 작은 은하의 중심일 수 있으며, 2024년 중간 질량 블랙홀의 증거가 나왔습니다.',
      'Possibly the core of a swallowed dwarf galaxy; evidence for an intermediate-mass black hole emerged in 2024.',
    ),
  },
  {
    id: 'kepler452',
    name: both('케플러-452', 'Kepler-452'),
    kind: 'planetarySystem',
    ra: 296.004,
    dec: 44.278,
    distanceLy: 1800,
    facts: both(
      '지구의 사촌이라 불린 행성 452b',
      'Home of “Earth’s cousin,” planet 452b',
    ),
    note: both(
      '태양형 별의 거주 가능 영역을 도는 지구보다 큰 행성입니다.',
      'A larger-than-Earth planet in a Sun-like star’s habitable zone.',
    ),
  },
  {
    id: 'lmc',
    name: both('대마젤란 은하', 'Large Magellanic Cloud'),
    kind: 'satellite',
    ra: 80.894,
    dec: -69.756,
    distanceLy: 160_000,
    facts: both(
      '우리 은하의 가장 큰 위성 은하',
      'The Galaxy’s largest satellite',
    ),
    note: both(
      '1987년 초신성 SN 1987A가 터진 곳입니다.',
      'Where supernova SN 1987A exploded.',
    ),
  },
  {
    id: 'smc',
    name: both('소마젤란 은하', 'Small Magellanic Cloud'),
    kind: 'satellite',
    ra: 13.187,
    dec: -72.829,
    distanceLy: 200_000,
    facts: both(
      '남반구 하늘에서 맨눈으로 보이는 위성 은하',
      'A satellite galaxy visible from the southern hemisphere',
    ),
    note: both(
      '대마젤란 은하와 기체 다리로 이어져 있습니다.',
      'Linked to the Large Cloud by a bridge of gas.',
    ),
  },
]

export const GALAXY_OBJECT_BY_ID = Object.fromEntries(
  GALAXY_OBJECTS.map((o) => [o.id, o]),
) as Record<string, GalaxyObject>

/** 은하 중심에서 태양까지 (광년) */
export const SUN_GALACTOCENTRIC_LY = 26_670
/** 은하 1년 (년) */
export const GALACTIC_YEAR = 2.3e8

/** 드레이크 방정식: N = R* · fp · ne · fl · fi · fc · L */
export interface DrakeInput {
  starFormation: number
  planetFraction: number
  habitablePerSystem: number
  lifeFraction: number
  intelligenceFraction: number
  communicationFraction: number
  lifetimeYears: number
}

export const drake = (d: DrakeInput) =>
  d.starFormation *
  d.planetFraction *
  d.habitablePerSystem *
  d.lifeFraction *
  d.intelligenceFraction *
  d.communicationFraction *
  d.lifetimeYears
