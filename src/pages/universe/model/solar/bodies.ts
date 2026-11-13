import { both } from '@/shared/i18n'
import type { Text } from '@/shared/i18n'
import type { Elements } from './kepler'

export type BodyId =
  | 'sun'
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'moon'
  | 'mars'
  | 'ceres'
  | 'jupiter'
  | 'io'
  | 'europa'
  | 'ganymede'
  | 'callisto'
  | 'saturn'
  | 'titan'
  | 'uranus'
  | 'neptune'
  | 'pluto'
  | 'halley'
  | 'apophis'

export type BodyKind =
  'star' | 'planet' | 'dwarf' | 'moon' | 'comet' | 'asteroid'

/** JPL 근사 궤도 요소 표 한 줄: [값, 세기당 변화] (Standish, 1800~2050년에 유효) */
export interface SecularRow {
  a: readonly [number, number]
  e: readonly [number, number]
  i: readonly [number, number]
  /** 평균 경도 L */
  L: readonly [number, number]
  /** 근일점 경도 ϖ */
  peri: readonly [number, number]
  /** 승교점 경도 Ω */
  node: readonly [number, number]
}

export type OrbitSpec =
  | { type: 'none' }
  | { type: 'secular'; row: SecularRow }
  | { type: 'osculating'; elements: Elements; epochJd: number }
  /** 지구의 달: 황도 기준 평균 궤도 요소와 세차 */
  | { type: 'moon' }
  /** 모행성 적도면의 원 궤도 */
  | {
      type: 'satellite'
      aKm: number
      periodDays: number
      /** epochJd 때의 평균 경도 (도) */
      l0: number
      epochJd: number
    }

/** IAU 자전축(ICRF 적경·적위)과 본초 자오선 W = w0 + rate·d (d: J2000 이후 일수) */
export interface Pole {
  ra: number
  dec: number
  w0: number
  rate: number
}

export interface BodyInfo {
  id: BodyId
  kind: BodyKind
  parent?: BodyId
  name: Text
  radiusKm: number
  /** 지구 질량 배수 */
  massEarth: number
  /** 표면 중력 (m/s²) */
  gravity: number
  /** 항성 자전 주기 (시간, 음수면 역행) */
  rotationHours: number
  /** 오늘날 평균 기온 (°C) */
  meanTempC: number
  /** 본드 반사율 */
  albedo: number
  moons?: { count: number; plus?: boolean }
  atmosphere: Text
  summary: Text
  /** 탐사 단계: 0 관측, 1 근접 비행, 2 궤도 탐사, 3 착륙, 4 사람이 감 */
  explored: 0 | 1 | 2 | 3 | 4
  exploredNote: Text
  pole?: Pole
  /** 모행성을 향해 한쪽 면만 보임 */
  tidallyLocked?: boolean
  texture?: string
  color: string
  glow?: { color: string; strength: number }
  rings?: { inner: number; outer: number }
  /** 자기권이 있어 태양 폭풍 때 오로라가 생김 */
  magnetosphere?: boolean
  orbit: OrbitSpec
}

const J2000 = 2451545.0
const MEEUS_EPOCH = 2443000.5

export const BODIES: Record<BodyId, BodyInfo> = {
  sun: {
    id: 'sun',
    kind: 'star',
    name: both('태양', 'Sun'),
    radiusKm: 695_700,
    massEarth: 332_946,
    gravity: 274,
    rotationHours: 609.12,
    meanTempC: 5500,
    albedo: 0,
    atmosphere: both(
      '수소 73%·헬륨 25% (플라스마)',
      'Hydrogen 73%, helium 25% (plasma)',
    ),
    summary: both(
      '태양계 질량의 99.86%를 차지하는 G형 주계열성입니다. 지금 나이는 약 46억 년이고, 핵의 수소를 태워 점점 밝아집니다.',
      'A G-type main-sequence star holding 99.86% of the Solar System’s mass. About 4.6 billion years old, it slowly brightens as it burns hydrogen in its core.',
    ),
    explored: 2,
    exploredNote: both(
      '파커 태양 탐사선이 코로나 안까지 들어감 (2021~)',
      'Parker Solar Probe flies through the corona (2021–)',
    ),
    pole: { ra: 286.13, dec: 63.87, w0: 84.176, rate: 14.1844 },
    color: '#ffd27a',
    orbit: { type: 'none' },
  },
  mercury: {
    id: 'mercury',
    kind: 'planet',
    name: both('수성', 'Mercury'),
    radiusKm: 2439.7,
    massEarth: 0.0553,
    gravity: 3.7,
    rotationHours: 1407.6,
    meanTempC: 167,
    albedo: 0.068,
    moons: { count: 0 },
    atmosphere: both('거의 없음 (얇은 외기권)', 'Almost none (thin exosphere)'),
    summary: both(
      '태양에 가장 가까운 행성입니다. 공기가 없어 낮에는 430°C, 밤에는 −180°C까지 오르내립니다.',
      'The innermost planet. With no air, it swings from 430°C by day to −180°C at night.',
    ),
    explored: 2,
    exploredNote: both(
      '메신저 궤도선 (2011~2015), 베피콜롬보 (2026~)',
      'MESSENGER orbiter (2011–2015), BepiColombo (2026–)',
    ),
    pole: { ra: 281.0103, dec: 61.4155, w0: 329.5988, rate: 6.1385108 },
    texture: 'mercury',
    color: '#a39f99',
    orbit: {
      type: 'secular',
      row: {
        a: [0.38709927, 0.00000037],
        e: [0.20563593, 0.00001906],
        i: [7.00497902, -0.00594749],
        L: [252.2503235, 149472.67411175],
        peri: [77.45779628, 0.16047689],
        node: [48.33076593, -0.12534081],
      },
    },
  },
  venus: {
    id: 'venus',
    kind: 'planet',
    name: both('금성', 'Venus'),
    radiusKm: 6051.8,
    massEarth: 0.815,
    gravity: 8.87,
    rotationHours: -5832.5,
    meanTempC: 464,
    albedo: 0.77,
    moons: { count: 0 },
    atmosphere: both(
      '이산화탄소 96.5%, 지표 92기압',
      'CO₂ 96.5%, 92 bar at the surface',
    ),
    summary: both(
      '두꺼운 이산화탄소 대기의 온실 효과로 태양계에서 가장 뜨거운 행성입니다. 거꾸로, 아주 느리게 돕니다.',
      'A runaway greenhouse under thick CO₂ makes it the hottest planet. It spins backwards, and very slowly.',
    ),
    explored: 3,
    exploredNote: both(
      '베네라 착륙선 (1970~1982)',
      'Venera landers (1970–1982)',
    ),
    pole: { ra: 272.76, dec: 67.16, w0: 160.2, rate: -1.4813688 },
    texture: 'venus',
    color: '#e8d4a6',
    glow: { color: '#f3dca3', strength: 0.75 },
    orbit: {
      type: 'secular',
      row: {
        a: [0.72333566, 0.0000039],
        e: [0.00677672, -0.00004107],
        i: [3.39467605, -0.0007889],
        L: [181.9790995, 58517.81538729],
        peri: [131.60246718, 0.00268329],
        node: [76.67984255, -0.27769418],
      },
    },
  },
  earth: {
    id: 'earth',
    kind: 'planet',
    name: both('지구', 'Earth'),
    radiusKm: 6371,
    massEarth: 1,
    gravity: 9.81,
    rotationHours: 23.9345,
    meanTempC: 15,
    albedo: 0.306,
    moons: { count: 1 },
    atmosphere: both('질소 78%·산소 21%, 1기압', 'N₂ 78%, O₂ 21%, 1 bar'),
    summary: both(
      '액체 바다와 생명이 있는 유일한 행성으로 알려져 있습니다. 태양이 밝아지면 약 10억 년 뒤 바다가 마르기 시작합니다.',
      'The only known world with liquid oceans and life. As the Sun brightens, its oceans begin to dry in about a billion years.',
    ),
    explored: 4,
    exploredNote: both('인류의 고향', 'Home of humanity'),
    pole: { ra: 0, dec: 90, w0: 190.147, rate: 360.9856235 },
    texture: 'earth',
    color: '#5b8ee6',
    glow: { color: '#5fb7ff', strength: 1 },
    magnetosphere: true,
    orbit: {
      type: 'secular',
      row: {
        a: [1.00000261, 0.00000562],
        e: [0.01671123, -0.00004392],
        i: [-0.00001531, -0.01294668],
        L: [100.46457166, 35999.37244981],
        peri: [102.93768193, 0.32327364],
        node: [0, 0],
      },
    },
  },
  moon: {
    id: 'moon',
    kind: 'moon',
    parent: 'earth',
    name: both('달', 'Moon'),
    radiusKm: 1737.4,
    massEarth: 0.0123,
    gravity: 1.62,
    rotationHours: 655.72,
    meanTempC: -20,
    albedo: 0.11,
    atmosphere: both('거의 없음', 'Almost none'),
    summary: both(
      '지구의 하나뿐인 자연 위성입니다. 해마다 3.8cm씩 멀어지며, 늘 같은 면을 지구로 향합니다.',
      'Earth’s only natural satellite. It drifts 3.8 cm farther every year and always shows Earth the same face.',
    ),
    explored: 4,
    exploredNote: both(
      '아폴로 유인 착륙 (1969~1972), 아르테미스 계획',
      'Apollo crewed landings (1969–1972), Artemis program',
    ),
    pole: { ra: 269.9949, dec: 66.5392, w0: 38.3213, rate: 13.17635815 },
    texture: 'moon',
    color: '#bdbab3',
    orbit: { type: 'moon' },
  },
  mars: {
    id: 'mars',
    kind: 'planet',
    name: both('화성', 'Mars'),
    radiusKm: 3389.5,
    massEarth: 0.107,
    gravity: 3.71,
    rotationHours: 24.6229,
    meanTempC: -65,
    albedo: 0.25,
    moons: { count: 2 },
    atmosphere: both('이산화탄소 95%, 0.006기압', 'CO₂ 95%, 0.006 bar'),
    summary: both(
      '산화철 먼지로 붉게 보이는 사막 행성입니다. 자기장을 잃어 태양풍에 대기가 깎여 나갔고, 극관과 땅속에 얼음이 있습니다.',
      'A desert world reddened by iron-oxide dust. Without a global magnetic field the solar wind stripped its air; ice remains at the poles and underground.',
    ),
    explored: 3,
    exploredNote: both(
      '퍼서비어런스·큐리오시티 탐사차',
      'Perseverance and Curiosity rovers',
    ),
    pole: { ra: 317.269, dec: 54.432, w0: 176.049863, rate: 350.891982443297 },
    texture: 'mars',
    color: '#c8653d',
    glow: { color: '#e9a27a', strength: 0.35 },
    orbit: {
      type: 'secular',
      row: {
        a: [1.52371034, 0.00001847],
        e: [0.0933941, 0.00007882],
        i: [1.84969142, -0.00813131],
        L: [-4.55343205, 19140.30268499],
        peri: [-23.94362959, 0.44441088],
        node: [49.55953891, -0.29257343],
      },
    },
  },
  ceres: {
    id: 'ceres',
    kind: 'dwarf',
    name: both('세레스', 'Ceres'),
    radiusKm: 469.7,
    massEarth: 0.000157,
    gravity: 0.28,
    rotationHours: 9.074,
    meanTempC: -105,
    albedo: 0.09,
    moons: { count: 0 },
    atmosphere: both('없음 (가끔 수증기)', 'None (occasional water vapour)'),
    summary: both(
      '소행성대에서 가장 큰 천체이자 왜소 행성입니다. 오카토르 크레이터의 밝은 점은 지하 소금물이 올라와 남긴 탄산나트륨입니다.',
      'The largest object in the asteroid belt and a dwarf planet. The bright spots in Occator crater are sodium carbonate left by brine from below.',
    ),
    explored: 2,
    exploredNote: both('던 궤도선 (2015~2018)', 'Dawn orbiter (2015–2018)'),
    pole: { ra: 291.418, dec: 66.764, w0: 170.65, rate: 952.1532 },
    color: '#8e8a84',
    orbit: {
      type: 'osculating',
      epochJd: 2461200.5,
      elements: {
        a: 2.765552595034094,
        e: 0.07969229514816586,
        i: 10.58802780183462,
        node: 80.24862682043221,
        argPeri: 73.29421453021587,
        meanAnomaly: 274.4193463761342,
      },
    },
  },
  jupiter: {
    id: 'jupiter',
    kind: 'planet',
    name: both('목성', 'Jupiter'),
    radiusKm: 69_911,
    massEarth: 317.8,
    gravity: 24.79,
    rotationHours: 9.925,
    meanTempC: -110,
    albedo: 0.343,
    moons: { count: 95, plus: true },
    atmosphere: both('수소 90%·헬륨 10%', 'H₂ 90%, He 10%'),
    summary: both(
      '태양계에서 가장 큰 행성입니다. 대적점은 지구보다 큰 폭풍이고, 강한 중력으로 혜성과 소행성의 궤도를 바꿉니다.',
      'The largest planet. The Great Red Spot is a storm bigger than Earth, and its gravity reshapes the orbits of comets and asteroids.',
    ),
    explored: 2,
    exploredNote: both('갈릴레오·주노 궤도선', 'Galileo and Juno orbiters'),
    pole: { ra: 268.056595, dec: 64.495303, w0: 284.95, rate: 870.536 },
    texture: 'jupiter',
    color: '#d9b38a',
    glow: { color: '#ead0a8', strength: 0.3 },
    magnetosphere: true,
    orbit: {
      type: 'secular',
      row: {
        a: [5.202887, -0.00011607],
        e: [0.04838624, -0.00013253],
        i: [1.30439695, -0.00183714],
        L: [34.39644051, 3034.74612775],
        peri: [14.72847983, 0.21252668],
        node: [100.47390909, 0.20469106],
      },
    },
  },
  io: {
    id: 'io',
    kind: 'moon',
    parent: 'jupiter',
    name: both('이오', 'Io'),
    radiusKm: 1821.6,
    massEarth: 0.015,
    gravity: 1.8,
    rotationHours: 42.46,
    meanTempC: -143,
    albedo: 0.63,
    atmosphere: both('얇은 이산화황', 'Thin SO₂'),
    summary: both(
      '목성의 조석력에 속이 데워져 화산 400여 개가 터지는, 태양계에서 화산 활동이 가장 활발한 천체입니다.',
      'Tidal heating from Jupiter powers some 400 volcanoes — the most volcanically active body in the Solar System.',
    ),
    explored: 1,
    exploredNote: both('갈릴레오·주노 근접 비행', 'Galileo and Juno flybys'),
    tidallyLocked: true,
    color: '#e6cf63',
    orbit: {
      type: 'satellite',
      aKm: 421_700,
      periodDays: 1.769137786,
      l0: 106.07719,
      epochJd: MEEUS_EPOCH,
    },
  },
  europa: {
    id: 'europa',
    kind: 'moon',
    parent: 'jupiter',
    name: both('유로파', 'Europa'),
    radiusKm: 1560.8,
    massEarth: 0.008,
    gravity: 1.31,
    rotationHours: 85.23,
    meanTempC: -160,
    albedo: 0.62,
    atmosphere: both('아주 얇은 산소', 'Very thin O₂'),
    summary: both(
      '얼음 껍질 아래에 지구 바다보다 물이 많은 바다가 있다고 봅니다. 생명을 찾을 유력한 후보입니다.',
      'Beneath its ice shell lies an ocean holding more water than Earth’s — a leading place to search for life.',
    ),
    explored: 1,
    exploredNote: both(
      '유로파 클리퍼 2030년 도착 예정',
      'Europa Clipper arrives in 2030',
    ),
    tidallyLocked: true,
    color: '#d9ccb4',
    orbit: {
      type: 'satellite',
      aKm: 671_034,
      periodDays: 3.551181,
      l0: 175.73161,
      epochJd: MEEUS_EPOCH,
    },
  },
  ganymede: {
    id: 'ganymede',
    kind: 'moon',
    parent: 'jupiter',
    name: both('가니메데', 'Ganymede'),
    radiusKm: 2634.1,
    massEarth: 0.025,
    gravity: 1.43,
    rotationHours: 171.7,
    meanTempC: -163,
    albedo: 0.43,
    atmosphere: both('아주 얇은 산소', 'Very thin O₂'),
    summary: both(
      '수성보다 큰, 태양계에서 가장 큰 위성입니다. 위성 가운데 유일하게 자기장이 있습니다.',
      'The largest moon in the Solar System — bigger than Mercury — and the only moon with its own magnetic field.',
    ),
    explored: 1,
    exploredNote: both('주스(JUICE) 2031년 도착 예정', 'JUICE arrives in 2031'),
    tidallyLocked: true,
    magnetosphere: true,
    color: '#9c917f',
    orbit: {
      type: 'satellite',
      aKm: 1_070_412,
      periodDays: 7.15455296,
      l0: 120.55883,
      epochJd: MEEUS_EPOCH,
    },
  },
  callisto: {
    id: 'callisto',
    kind: 'moon',
    parent: 'jupiter',
    name: both('칼리스토', 'Callisto'),
    radiusKm: 2410.3,
    massEarth: 0.018,
    gravity: 1.24,
    rotationHours: 400.5,
    meanTempC: -139,
    albedo: 0.22,
    atmosphere: both('아주 얇은 이산화탄소', 'Very thin CO₂'),
    summary: both(
      '크레이터로 빈틈없이 덮인 오래된 표면을 가졌습니다. 목성의 방사선대 밖에 있어 기지 후보로 꼽힙니다.',
      'Its ancient surface is saturated with craters. Lying outside Jupiter’s radiation belts, it is a candidate base site.',
    ),
    explored: 1,
    exploredNote: both('갈릴레오 근접 비행', 'Galileo flybys'),
    tidallyLocked: true,
    color: '#6e665b',
    orbit: {
      type: 'satellite',
      aKm: 1_882_709,
      periodDays: 16.6890184,
      l0: 84.44459,
      epochJd: MEEUS_EPOCH,
    },
  },
  saturn: {
    id: 'saturn',
    kind: 'planet',
    name: both('토성', 'Saturn'),
    radiusKm: 58_232,
    massEarth: 95.16,
    gravity: 10.44,
    rotationHours: 10.656,
    meanTempC: -140,
    albedo: 0.342,
    moons: { count: 274, plus: true },
    atmosphere: both('수소 96%·헬륨 3%', 'H₂ 96%, He 3%'),
    summary: both(
      '얼음과 암석 조각으로 된 넓은 고리가 있는 가스 행성입니다. 밀도가 물보다 낮습니다.',
      'A gas giant with broad rings of ice and rock. Its average density is lower than water’s.',
    ),
    explored: 2,
    exploredNote: both(
      '카시니 궤도선 (2004~2017)',
      'Cassini orbiter (2004–2017)',
    ),
    pole: { ra: 40.589, dec: 83.537, w0: 38.9, rate: 810.7939024 },
    texture: 'saturn',
    color: '#e3cf9b',
    glow: { color: '#f0dfb2', strength: 0.3 },
    rings: { inner: 1.239, outer: 2.27 },
    magnetosphere: true,
    orbit: {
      type: 'secular',
      row: {
        a: [9.53667594, -0.0012506],
        e: [0.05386179, -0.00050991],
        i: [2.48599187, 0.00193609],
        L: [49.95424423, 1222.49362201],
        peri: [92.59887831, -0.41897216],
        node: [113.66242448, -0.28867794],
      },
    },
  },
  titan: {
    id: 'titan',
    kind: 'moon',
    parent: 'saturn',
    name: both('타이탄', 'Titan'),
    radiusKm: 2574.7,
    massEarth: 0.0225,
    gravity: 1.35,
    rotationHours: 382.7,
    meanTempC: -179,
    albedo: 0.27,
    atmosphere: both('질소 95%·메테인 5%, 1.5기압', 'N₂ 95%, CH₄ 5%, 1.5 bar'),
    summary: both(
      '두꺼운 대기와 메테인 호수·강·비가 있는 위성입니다. 태양이 적색 거성이 되면 따뜻해질 수 있습니다.',
      'A moon with a thick atmosphere and methane lakes, rivers and rain. It may warm up when the Sun becomes a red giant.',
    ),
    explored: 3,
    exploredNote: both(
      '하위헌스 착륙 (2005), 드래건플라이 2034년 도착 예정',
      'Huygens landing (2005), Dragonfly arrives in 2034',
    ),
    tidallyLocked: true,
    color: '#d6a04b',
    glow: { color: '#e5a64b', strength: 0.85 },
    orbit: {
      type: 'satellite',
      aKm: 1_221_870,
      periodDays: 15.945421,
      l0: 0,
      epochJd: J2000,
    },
  },
  uranus: {
    id: 'uranus',
    kind: 'planet',
    name: both('천왕성', 'Uranus'),
    radiusKm: 25_362,
    massEarth: 14.54,
    gravity: 8.87,
    rotationHours: -17.24,
    meanTempC: -195,
    albedo: 0.3,
    moons: { count: 29 },
    atmosphere: both('수소·헬륨·메테인', 'H₂, He, CH₄'),
    summary: both(
      '자전축이 98° 기울어 옆으로 누운 채 공전하는 얼음 거인입니다. 극지방은 42년씩 낮과 밤이 이어집니다.',
      'An ice giant tilted 98°, rolling around the Sun on its side. Each pole gets 42 years of day, then 42 of night.',
    ),
    explored: 1,
    exploredNote: both('보이저 2호 근접 비행 (1986)', 'Voyager 2 flyby (1986)'),
    pole: { ra: 257.311, dec: -15.175, w0: 203.81, rate: -501.1600928 },
    texture: 'uranus',
    color: '#a7e0e6',
    glow: { color: '#a8f0f5', strength: 0.45 },
    magnetosphere: true,
    orbit: {
      type: 'secular',
      row: {
        a: [19.18916464, -0.00196176],
        e: [0.04725744, -0.00004397],
        i: [0.77263783, -0.00242939],
        L: [313.23810451, 428.48202785],
        peri: [170.9542763, 0.40805281],
        node: [74.01692503, 0.04240589],
      },
    },
  },
  neptune: {
    id: 'neptune',
    kind: 'planet',
    name: both('해왕성', 'Neptune'),
    radiusKm: 24_622,
    massEarth: 17.15,
    gravity: 11.15,
    rotationHours: 16.11,
    meanTempC: -200,
    albedo: 0.29,
    moons: { count: 16 },
    atmosphere: both('수소·헬륨·메테인', 'H₂, He, CH₄'),
    summary: both(
      '태양계에서 가장 먼 행성으로, 초속 600m의 바람이 붑니다. 계산으로 먼저 위치를 예측한 뒤 찾아냈습니다.',
      'The outermost planet, with winds of 600 m/s. Its position was predicted by calculation before it was found.',
    ),
    explored: 1,
    exploredNote: both('보이저 2호 근접 비행 (1989)', 'Voyager 2 flyby (1989)'),
    pole: { ra: 299.36, dec: 43.46, w0: 249.978, rate: 541.1397757 },
    texture: 'neptune',
    color: '#5479e0',
    glow: { color: '#6f95ff', strength: 0.5 },
    magnetosphere: true,
    orbit: {
      type: 'secular',
      row: {
        a: [30.06992276, 0.00026291],
        e: [0.00859048, 0.00005105],
        i: [1.77004347, 0.00035372],
        L: [-55.12002969, 218.45945325],
        peri: [44.96476227, -0.32241464],
        node: [131.78422574, -0.00508664],
      },
    },
  },
  pluto: {
    id: 'pluto',
    kind: 'dwarf',
    name: both('명왕성', 'Pluto'),
    radiusKm: 1188.3,
    massEarth: 0.0022,
    gravity: 0.62,
    rotationHours: -153.29,
    meanTempC: -225,
    albedo: 0.72,
    moons: { count: 5 },
    atmosphere: both('얇은 질소', 'Thin N₂'),
    summary: both(
      '카이퍼 벨트의 왜소 행성입니다. 하트 모양의 질소 빙하 평원(스푸트니크 평원)과 푸른 안개가 있습니다.',
      'A Kuiper Belt dwarf planet with a heart-shaped nitrogen-ice plain (Sputnik Planitia) and blue haze.',
    ),
    explored: 1,
    exploredNote: both(
      '뉴호라이즌스 근접 비행 (2015)',
      'New Horizons flyby (2015)',
    ),
    pole: { ra: 132.993, dec: -6.163, w0: 302.695, rate: -56.3625225 },
    color: '#d3b48f',
    glow: { color: '#a8c4ff', strength: 0.18 },
    orbit: {
      type: 'secular',
      row: {
        a: [39.48211675, -0.00031596],
        e: [0.2488273, 0.0000517],
        i: [17.14001206, 0.00004818],
        L: [238.92903833, 145.20780515],
        peri: [224.06891629, -0.04062942],
        node: [110.30393684, -0.01183482],
      },
    },
  },
  halley: {
    id: 'halley',
    kind: 'comet',
    name: both('핼리 혜성', 'Halley’s Comet'),
    radiusKm: 5.5,
    massEarth: 3.7e-11,
    gravity: 0.0005,
    rotationHours: 52.8,
    meanTempC: -170,
    albedo: 0.04,
    atmosphere: both(
      '태양 가까이에서 코마와 꼬리',
      'Coma and tails near the Sun',
    ),
    summary: both(
      '약 76년마다 돌아오는 주기 혜성입니다. 다음 근일점은 2061년 7월이고, 5월의 물병자리 에타·10월의 오리온자리 유성우를 남깁니다.',
      'A periodic comet returning about every 76 years. Next perihelion is July 2061; its dust makes the Eta Aquariids in May and the Orionids in October.',
    ),
    explored: 1,
    exploredNote: both('조토 근접 비행 (1986)', 'Giotto flyby (1986)'),
    color: '#b4ada3',
    orbit: {
      type: 'osculating',
      // 2061년 7월 28일 근일점을 기준으로, 1986→2061년 평균 주기에 맞춘 긴반지름
      epochJd: 2474033.5,
      elements: {
        a: 17.857,
        e: 0.96714,
        i: 162.1905300439129,
        node: 59.09894720612437,
        argPeri: 112.2414314637764,
        meanAnomaly: 0,
      },
    },
  },
  apophis: {
    id: 'apophis',
    kind: 'asteroid',
    name: both('아포피스', 'Apophis'),
    radiusKm: 0.17,
    massEarth: 1e-14,
    gravity: 0.0001,
    rotationHours: 30.56,
    meanTempC: 20,
    albedo: 0.35,
    atmosphere: both('없음', 'None'),
    summary: both(
      '지름 약 340m의 근지구 소행성입니다. 2029년 4월 13일 지구 중심에서 약 3만 8천 km 거리를 스쳐 지나갑니다(충돌하지 않음).',
      'A ~340 m near-Earth asteroid. On 13 April 2029 it passes about 38,000 km from Earth’s centre — no impact.',
    ),
    explored: 0,
    exploredNote: both(
      '오시리스-에이펙스 2029년 도착 예정',
      'OSIRIS-APEX arrives in 2029',
    ),
    color: '#8e8378',
    orbit: {
      type: 'osculating',
      epochJd: 2461200.5,
      elements: {
        a: 0.9223592206975018,
        e: 0.1911492279663492,
        i: 3.340996879880978,
        node: 203.8936514240762,
        argPeri: 126.6795706895841,
        meanAnomaly: 175.3304026592739,
      },
    },
  },
}

export const BODY_IDS = Object.keys(BODIES) as BodyId[]

/** 목적지 띠에 놓을 주요 천체 */
export const MAIN_DESTINATIONS: BodyId[] = [
  'sun',
  'mercury',
  'venus',
  'earth',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
]

export const moonsOf = (id: BodyId): BodyId[] =>
  BODY_IDS.filter((other) => BODIES[other].parent === id)

export const isBodyId = (value: string): value is BodyId =>
  Object.hasOwn(BODIES, value)
