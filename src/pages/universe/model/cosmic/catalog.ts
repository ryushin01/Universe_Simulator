import { both } from '@/shared/i18n'
import type { Text } from '@/shared/i18n'

export type StructureKind =
  | 'group'
  | 'cluster'
  | 'supercluster'
  | 'wall'
  | 'void'
  | 'lqg'
  | 'ring'
  | 'horizon'

export interface CosmicStructure {
  id: string
  name: Text
  kind: StructureKind
  /** 방향 (적경·적위, 도). 우리를 둘러싼 것은 null */
  ra: number | null
  dec: number | null
  /** 공동 거리 (백만 광년) */
  distanceMly: number
  /** 크기 (백만 광년) */
  sizeMly: number
  year?: number
  note: Text
}

/**
 * 우주 거대 구조 (거리는 공동 거리, 위치·크기는 대략값).
 * 나무위키 '우주 거대 구조' 문서의 분류(은하군, 은하단, 초은하단, 필라멘트, 장성, 거대 퀘이사군, 공동)를 따랐습니다.
 */
export const COSMIC_STRUCTURES: CosmicStructure[] = [
  {
    id: 'local-group',
    name: both('국부 은하군', 'Local Group'),
    kind: 'group',
    ra: null,
    dec: null,
    distanceMly: 0,
    sizeMly: 10,
    note: both(
      '우리 은하와 안드로메다를 중심으로 은하 80여 개가 모인 은하군입니다.',
      'About 80 galaxies gathered around the Milky Way and Andromeda.',
    ),
  },
  {
    id: 'virgo-cluster',
    name: both('처녀자리 은하단', 'Virgo Cluster'),
    kind: 'cluster',
    ra: 187.7,
    dec: 12.4,
    distanceMly: 54,
    sizeMly: 15,
    note: both(
      '은하 1,300~2,000개가 모인 가장 가까운 큰 은하단. 중심 은하 M87의 블랙홀은 2019년 인류가 처음 찍은 블랙홀입니다.',
      'The nearest big cluster, with 1,300–2,000 galaxies; the black hole in its central galaxy M87 was the first ever imaged (2019).',
    ),
  },
  {
    id: 'local-void',
    name: both('국부 공동', 'Local Void'),
    kind: 'void',
    ra: 279.5,
    dec: 18,
    distanceMly: 75,
    sizeMly: 200,
    year: 1987,
    note: both(
      '우리 은하 옆의 텅 빈 곳(1987년 발견). 우리 은하는 이곳에서 초속 약 270km로 멀어지고 있습니다.',
      'An empty region next door (found in 1987); the Milky Way is moving away from it at ~270 km/s.',
    ),
  },
  {
    id: 'laniakea',
    name: both('라니아케아 초은하단', 'Laniakea Supercluster'),
    kind: 'supercluster',
    ra: 243.9,
    dec: -60.9,
    distanceMly: 250,
    sizeMly: 520,
    year: 2014,
    note: both(
      '우리 은하가 속한 초은하단. 은하 약 10만 개가 거대 인력체 쪽으로 흐릅니다. 하와이어로 ‘헤아릴 수 없는 하늘’이라는 뜻입니다 (2014).',
      'Our home supercluster: ~100,000 galaxies flowing toward the Great Attractor. Hawaiian for “immeasurable heaven” (2014).',
    ),
  },
  {
    id: 'great-attractor',
    name: both('거대 인력체', 'Great Attractor'),
    kind: 'cluster',
    ra: 243.9,
    dec: -60.9,
    distanceMly: 220,
    sizeMly: 30,
    note: both(
      '은하수의 먼지에 가려(가림 영역) 보기 힘든 중력 중심. 노르마 은하단 근처에 있습니다.',
      'A gravitational focus hidden behind the Milky Way’s dust (the Zone of Avoidance), near the Norma Cluster.',
    ),
  },
  {
    id: 'perseus-pisces',
    name: both(
      '페르세우스자리-물고기자리 초은하단',
      'Perseus–Pisces Supercluster',
    ),
    kind: 'supercluster',
    ra: 40,
    dec: 37,
    distanceMly: 250,
    sizeMly: 300,
    note: both(
      '가장 뚜렷한 은하 필라멘트 가운데 하나입니다.',
      'One of the most prominent galaxy filaments.',
    ),
  },
  {
    id: 'coma-cluster',
    name: both('머리털자리 은하단', 'Coma Cluster'),
    kind: 'cluster',
    ra: 194.95,
    dec: 27.98,
    distanceMly: 321,
    sizeMly: 20,
    note: both(
      '1933년 츠비키가 은하들의 움직임에서 보이지 않는 질량, 곧 암흑 물질을 처음 떠올린 은하단입니다.',
      'Where Zwicky first inferred unseen mass — dark matter — from galaxy motions in 1933.',
    ),
  },
  {
    id: 'shapley',
    name: both('섀플리 초은하단', 'Shapley Supercluster'),
    kind: 'supercluster',
    ra: 202,
    dec: -31.5,
    distanceMly: 650,
    sizeMly: 400,
    note: both(
      '가까운 우주에서 질량이 가장 많이 모인 곳입니다.',
      'The largest concentration of mass in the nearby universe.',
    ),
  },
  {
    id: 'bootes-void',
    name: both('목동자리 공동', 'Boötes Void'),
    kind: 'void',
    ra: 218,
    dec: 46,
    distanceMly: 700,
    sizeMly: 330,
    note: both(
      '지름 3억 광년이 넘는데 은하가 수십 개뿐이라 ‘거대한 무’라고도 부릅니다.',
      'Over 300 million ly across with only a few dozen galaxies — “the Great Nothing.”',
    ),
  },
  {
    id: 'pisces-cetus',
    name: both(
      '물고기자리-고래자리 복합 초은하단',
      'Pisces–Cetus Supercluster Complex',
    ),
    kind: 'supercluster',
    ra: 15,
    dec: -10,
    distanceMly: 600,
    sizeMly: 1000,
    note: both(
      '라니아케아의 약 2배 크기로, 우리 은하도 이 필라멘트에 놓여 있습니다.',
      'About twice Laniakea’s size; the Milky Way lies along this filament.',
    ),
  },
  {
    id: 'sloan-great-wall',
    name: both('슬론 장성', 'Sloan Great Wall'),
    kind: 'wall',
    ra: 195,
    dec: 2,
    distanceMly: 1000,
    sizeMly: 1370,
    year: 2003,
    note: both(
      '길이 약 13억 광년의 은하 벽 (2003년 발견).',
      'A galaxy wall ~1.37 billion ly long (found in 2003).',
    ),
  },
  {
    id: 'kbc-void',
    name: both('KBC 공동', 'KBC Void'),
    kind: 'void',
    ra: null,
    dec: null,
    distanceMly: 0,
    sizeMly: 2000,
    note: both(
      '우리를 둘러싼 지름 약 20억 광년의 밀도가 낮은 곳이라는 주장. 아직 논쟁 중입니다.',
      'A proposed ~2-billion-ly underdense region around us — still debated.',
    ),
  },
  {
    id: 'giant-arc',
    name: both('거대 호', 'Giant Arc'),
    kind: 'wall',
    ra: 225,
    dec: 35,
    distanceMly: 9200,
    sizeMly: 3300,
    year: 2021,
    note: both(
      '목동자리 쪽 약 33억 광년 길이의 은하 호 (2021).',
      'A 3.3-billion-ly arc of galaxies toward Boötes (2021).',
    ),
  },
  {
    id: 'big-ring',
    name: both('거대 고리', 'Big Ring'),
    kind: 'ring',
    ra: 220,
    dec: 30,
    distanceMly: 9200,
    sizeMly: 1300,
    year: 2024,
    note: both(
      '거대 호 옆의 지름 약 13억 광년 고리 (2024).',
      'A ~1.3-billion-ly ring beside the Giant Arc (2024).',
    ),
  },
  {
    id: 'huge-lqg',
    name: both('거대 퀘이사군 (Huge-LQG)', 'Huge Large Quasar Group'),
    kind: 'lqg',
    ra: 163,
    dec: 14,
    distanceMly: 12_900,
    sizeMly: 4000,
    year: 2013,
    note: both(
      '퀘이사 73개가 약 40억 광년에 걸쳐 늘어선 무리 (2013).',
      'Seventy-three quasars spread over ~4 billion ly (2013).',
    ),
  },
  {
    id: 'hcb-great-wall',
    name: both(
      '헤라클레스자리-북쪽왕관자리 장성',
      'Hercules–Corona Borealis Great Wall',
    ),
    kind: 'wall',
    ra: 240,
    dec: 30,
    distanceMly: 15_000,
    sizeMly: 10_000,
    year: 2013,
    note: both(
      '감마선 폭발의 분포로 찾은 길이 약 100억 광년의 구조. 알려진 가장 큰 구조물로, 관측 가능한 우주 지름의 약 11%입니다.',
      'Traced by gamma-ray bursts, ~10 billion ly long — the largest structure known, ~11% of the observable universe’s diameter.',
    ),
  },
  {
    id: 'cmb',
    name: both(
      '우주 배경 복사 (관측 가능한 우주의 끝)',
      'Cosmic microwave background (edge of the observable universe)',
    ),
    kind: 'horizon',
    ra: null,
    dec: null,
    distanceMly: 46_500,
    sizeMly: 93_000,
    note: both(
      '빅뱅 약 38만 년 뒤 우주가 투명해질 때 나온 빛. 지금은 약 465억 광년 떨어진 곳에서 와 2.7K 마이크로파로 보입니다.',
      'Light released ~380,000 years after the Big Bang, now arriving from ~46.5 billion ly away as 2.7 K microwaves.',
    ),
  },
]

export const COSMIC_BY_ID = Object.fromEntries(
  COSMIC_STRUCTURES.map((s) => [s.id, s]),
) as Record<string, CosmicStructure>

export const STRUCTURE_KIND_NAME: Record<StructureKind, Text> = {
  group: both('은하군', 'Galaxy group'),
  cluster: both('은하단', 'Galaxy cluster'),
  supercluster: both('초은하단', 'Supercluster'),
  wall: both('장성 (은하 벽)', 'Great wall'),
  void: both('공동', 'Void'),
  lqg: both('거대 퀘이사군', 'Large quasar group'),
  ring: both('고리 구조', 'Ring structure'),
  horizon: both('관측 가능한 우주의 끝', 'Edge of the observable universe'),
}
