import { both } from '@/shared/i18n'
import type { Text } from '@/shared/i18n'

export interface StarInfo {
  id: string
  name: Text
  /** 적경·적위 (도, J2000) */
  ra: number
  dec: number
  distanceLy: number
  spectral: string
  /** 겉보기 등급 */
  magnitude: number
  /** 질량·반지름·광도 (태양 = 1), 표면 온도 (K) */
  mass: number
  radius: number
  luminosity: number
  temperature: number
  planets?: Text
  note: Text
  /** 별 폭발 패널의 폭발 후보 id */
  blastId?: string
}

/** 태양 가까운 별과 이름난 밝은 별 (거리·물리량은 대략값) */
export const STARS: StarInfo[] = [
  {
    id: 'alpha-centauri',
    name: both('알파 센타우리 A·B', 'Alpha Centauri A & B'),
    ra: 219.902,
    dec: -60.834,
    distanceLy: 4.37,
    spectral: 'G2V + K1V',
    magnitude: -0.27,
    mass: 1.08,
    radius: 1.22,
    luminosity: 1.52,
    temperature: 5790,
    note: both(
      '태양과 비슷한 두 별이 80년마다 서로를 돕니다. 맨눈으로 보이는 가장 가까운 별입니다.',
      'Two Sun-like stars orbiting each other every 80 years — the nearest stars visible to the eye.',
    ),
  },
  {
    id: 'proxima',
    name: both('프록시마 센타우리', 'Proxima Centauri'),
    ra: 217.429,
    dec: -62.68,
    distanceLy: 4.24,
    spectral: 'M5.5Ve',
    magnitude: 11.13,
    mass: 0.122,
    radius: 0.154,
    luminosity: 0.0017,
    temperature: 3042,
    planets: both(
      '프록시마 b (거주 가능 영역), d',
      'Proxima b (habitable zone), d',
    ),
    note: both(
      '태양에서 가장 가까운 별. 자주 플레어를 내는 적색 왜성입니다.',
      'The Sun’s nearest neighbour, a flaring red dwarf.',
    ),
  },
  {
    id: 'barnard',
    name: both('바너드별', 'Barnard’s Star'),
    ra: 269.452,
    dec: 4.693,
    distanceLy: 5.96,
    spectral: 'M4V',
    magnitude: 9.5,
    mass: 0.16,
    radius: 0.19,
    luminosity: 0.0035,
    temperature: 3134,
    planets: both(
      '지구보다 작은 행성 4개 (2025년 확인)',
      'Four sub-Earth planets (confirmed 2025)',
    ),
    note: both(
      '하늘에서 가장 빨리 움직이는 별(고유 운동)입니다.',
      'The star with the fastest motion across our sky.',
    ),
  },
  {
    id: 'wolf359',
    name: both('울프 359', 'Wolf 359'),
    ra: 164.12,
    dec: 7.015,
    distanceLy: 7.86,
    spectral: 'M6V',
    magnitude: 13.5,
    mass: 0.11,
    radius: 0.14,
    luminosity: 0.0011,
    temperature: 2800,
    note: both(
      '아주 어둡고 차가운 적색 왜성입니다.',
      'A very faint, cool red dwarf.',
    ),
  },
  {
    id: 'lalande21185',
    name: both('랄랑드 21185', 'Lalande 21185'),
    ra: 165.836,
    dec: 35.97,
    distanceLy: 8.31,
    spectral: 'M2V',
    magnitude: 7.5,
    mass: 0.39,
    radius: 0.39,
    luminosity: 0.021,
    temperature: 3547,
    note: both(
      '북반구에서 보이는 가장 밝은 적색 왜성입니다.',
      'The brightest red dwarf in northern skies.',
    ),
  },
  {
    id: 'sirius',
    name: both('시리우스', 'Sirius'),
    ra: 101.287,
    dec: -16.716,
    distanceLy: 8.6,
    spectral: 'A1V + DA2',
    magnitude: -1.46,
    mass: 2.06,
    radius: 1.71,
    luminosity: 25.4,
    temperature: 9940,
    note: both(
      '밤하늘에서 가장 밝은 별. 동반성 시리우스 B는 백색 왜성입니다.',
      'The brightest star in the night sky; its companion Sirius B is a white dwarf.',
    ),
  },
  {
    id: 'ross248',
    name: both('로스 248', 'Ross 248'),
    ra: 355.48,
    dec: 44.18,
    distanceLy: 10.3,
    spectral: 'M6V',
    magnitude: 12.3,
    mass: 0.14,
    radius: 0.16,
    luminosity: 0.0018,
    temperature: 2800,
    note: both(
      '약 3만 6천 년 뒤 약 3광년까지 다가와 태양에서 가장 가까운 별이 됩니다.',
      'In ~36,000 years it will come within ~3 ly and become the Sun’s closest star.',
    ),
  },
  {
    id: 'epsilon-eridani',
    name: both('에리다누스자리 엡실론', 'Epsilon Eridani'),
    ra: 53.233,
    dec: -9.458,
    distanceLy: 10.5,
    spectral: 'K2V',
    magnitude: 3.73,
    mass: 0.82,
    radius: 0.74,
    luminosity: 0.34,
    temperature: 5084,
    planets: both(
      '목성형 행성 b와 먼지 원반',
      'Jupiter-like planet b and a debris disc',
    ),
    note: both(
      '젊은 태양 같은 별. 외계 지적 생명 탐사(SETI)의 첫 대상이었습니다.',
      'A young Sun-like star; an early SETI target.',
    ),
  },
  {
    id: 'ross128',
    name: both('로스 128', 'Ross 128'),
    ra: 176.94,
    dec: 0.8,
    distanceLy: 11,
    spectral: 'M4V',
    magnitude: 11.1,
    mass: 0.17,
    radius: 0.2,
    luminosity: 0.0036,
    temperature: 3192,
    planets: both('온화한 행성 로스 128 b', 'Temperate planet Ross 128 b'),
    note: both(
      '플레어가 적은 조용한 적색 왜성입니다.',
      'An unusually quiet red dwarf.',
    ),
  },
  {
    id: 'procyon',
    name: both('프로키온', 'Procyon'),
    ra: 114.825,
    dec: 5.225,
    distanceLy: 11.46,
    spectral: 'F5IV-V + DQZ',
    magnitude: 0.34,
    mass: 1.5,
    radius: 2.05,
    luminosity: 6.9,
    temperature: 6530,
    note: both(
      '작은개자리의 밝은 별. 백색 왜성 동반성이 있습니다.',
      'Canis Minor’s bright star, with a white-dwarf companion.',
    ),
  },
  {
    id: '61-cygni',
    name: both('백조자리 61', '61 Cygni'),
    ra: 316.725,
    dec: 38.749,
    distanceLy: 11.4,
    spectral: 'K5V + K7V',
    magnitude: 5.2,
    mass: 0.7,
    radius: 0.67,
    luminosity: 0.15,
    temperature: 4526,
    note: both(
      '1838년 베셀이 처음으로 연주시차를 재어 거리를 알아낸 별입니다.',
      'In 1838 Bessel measured its parallax — the first stellar distance ever measured.',
    ),
  },
  {
    id: 'epsilon-indi',
    name: both('인디언자리 엡실론', 'Epsilon Indi'),
    ra: 330.84,
    dec: -56.79,
    distanceLy: 11.9,
    spectral: 'K5V',
    magnitude: 4.7,
    mass: 0.76,
    radius: 0.71,
    luminosity: 0.22,
    temperature: 4630,
    planets: both(
      '제임스 웹이 직접 찍은 거대 행성 Ab (2024)',
      'Giant planet Ab, imaged by JWST (2024)',
    ),
    note: both(
      '갈색 왜성 두 개가 함께 돕니다.',
      'Two brown dwarfs orbit with it.',
    ),
  },
  {
    id: 'tau-ceti',
    name: both('고래자리 타우', 'Tau Ceti'),
    ra: 26.017,
    dec: -15.938,
    distanceLy: 11.9,
    spectral: 'G8V',
    magnitude: 3.5,
    mass: 0.78,
    radius: 0.79,
    luminosity: 0.52,
    temperature: 5344,
    planets: both('후보 행성 여러 개', 'Several candidate planets'),
    note: both(
      '가까운 태양형 별이라 SF에 자주 나옵니다.',
      'A nearby Sun-like star, a science-fiction favourite.',
    ),
  },
  {
    id: 'teegarden',
    name: both('티가든별', 'Teegarden’s Star'),
    ra: 43.25,
    dec: 16.88,
    distanceLy: 12.5,
    spectral: 'M7V',
    magnitude: 15.1,
    mass: 0.097,
    radius: 0.12,
    luminosity: 0.00073,
    temperature: 2904,
    planets: both(
      '지구만 한 행성 b·c (거주 가능 영역)',
      'Earth-mass planets b and c in the habitable zone',
    ),
    note: both(
      '지구와 가장 닮은 행성 후보를 거느린 별 가운데 하나입니다.',
      'Hosts some of the most Earth-like planet candidates.',
    ),
  },
  {
    id: 'kapteyn',
    name: both('카프테인별', 'Kapteyn’s Star'),
    ra: 77.92,
    dec: -45.02,
    distanceLy: 12.8,
    spectral: 'sdM1',
    magnitude: 8.85,
    mass: 0.27,
    radius: 0.29,
    luminosity: 0.012,
    temperature: 3550,
    note: both(
      '은하 헤일로에서 온 아주 늙은 별로, 은하 원반과 반대 방향으로 돕니다.',
      'A very old halo star circling the Galaxy against the disc’s rotation.',
    ),
  },
  {
    id: 'altair',
    name: both('알타이르 (견우성)', 'Altair'),
    ra: 297.696,
    dec: 8.868,
    distanceLy: 16.7,
    spectral: 'A7V',
    magnitude: 0.76,
    mass: 1.86,
    radius: 1.8,
    luminosity: 10.6,
    temperature: 7700,
    note: both(
      '9시간 만에 한 바퀴 도는 빠른 자전으로 적도가 부풀었습니다.',
      'Spins once every 9 hours, bulging at the equator.',
    ),
  },
  {
    id: 'gliese581',
    name: both('글리제 581', 'Gliese 581'),
    ra: 229.86,
    dec: -7.72,
    distanceLy: 20.5,
    spectral: 'M3V',
    magnitude: 10.6,
    mass: 0.31,
    radius: 0.3,
    luminosity: 0.012,
    temperature: 3480,
    planets: both('행성 3개', 'Three planets'),
    note: both(
      '거주 가능 영역 행성 논쟁으로 유명해진 적색 왜성입니다.',
      'A red dwarf famous for the debate over its habitable-zone planets.',
    ),
  },
  {
    id: 'vega',
    name: both('베가 (직녀성)', 'Vega'),
    ra: 279.235,
    dec: 38.784,
    distanceLy: 25,
    spectral: 'A0V',
    magnitude: 0.03,
    mass: 2.1,
    radius: 2.36,
    luminosity: 40,
    temperature: 9600,
    note: both(
      '약 1만 2천 년 뒤 북극성이 됩니다. 별 밝기 등급의 기준이었습니다.',
      'Will be the pole star in ~12,000 years; once the zero point of stellar magnitudes.',
    ),
  },
  {
    id: 'fomalhaut',
    name: both('포말하우트', 'Fomalhaut'),
    ra: 344.413,
    dec: -29.622,
    distanceLy: 25.1,
    spectral: 'A3V',
    magnitude: 1.16,
    mass: 1.92,
    radius: 1.84,
    luminosity: 16.6,
    temperature: 8590,
    note: both(
      '먼지 고리로 둘러싸인 젊은 별입니다.',
      'A young star ringed by dust.',
    ),
  },
  {
    id: 'arcturus',
    name: both('아크투루스', 'Arcturus'),
    ra: 213.915,
    dec: 19.182,
    distanceLy: 36.7,
    spectral: 'K1.5III',
    magnitude: -0.05,
    mass: 1.08,
    radius: 25.4,
    luminosity: 170,
    temperature: 4286,
    note: both(
      '늙은 적색 거성. 약 50억 년 뒤 태양도 이렇게 됩니다.',
      'An aging red giant — the Sun’s look in about 5 billion years.',
    ),
  },
  {
    id: 'trappist1',
    name: both('트라피스트-1', 'TRAPPIST-1'),
    ra: 346.62,
    dec: -5.04,
    distanceLy: 40.7,
    spectral: 'M8V',
    magnitude: 18.8,
    mass: 0.09,
    radius: 0.12,
    luminosity: 0.00055,
    temperature: 2566,
    planets: both(
      '지구만 한 행성 7개, 3개는 거주 가능 영역',
      'Seven Earth-size planets, three in the habitable zone',
    ),
    note: both(
      '목성만 한 별 둘레를 지구형 행성 7개가 촘촘히 돕니다.',
      'Seven rocky worlds packed around a Jupiter-sized star.',
    ),
  },
  {
    id: 'capella',
    name: both('카펠라', 'Capella'),
    ra: 79.172,
    dec: 45.998,
    distanceLy: 42.9,
    spectral: 'G3III + G0III',
    magnitude: 0.08,
    mass: 2.6,
    radius: 11.9,
    luminosity: 79,
    temperature: 4970,
    note: both(
      '거성 두 쌍으로 이뤄진 4중성입니다.',
      'A quadruple system built around two giants.',
    ),
  },
  {
    id: '51-pegasi',
    name: both('페가수스자리 51', '51 Pegasi'),
    ra: 344.367,
    dec: 20.769,
    distanceLy: 50.6,
    spectral: 'G2IV',
    magnitude: 5.49,
    mass: 1.11,
    radius: 1.15,
    luminosity: 1.36,
    temperature: 5768,
    planets: both('뜨거운 목성 51 Peg b (1995)', 'Hot Jupiter 51 Peg b (1995)'),
    note: both(
      '1995년 태양 같은 별 둘레에서 처음 외계 행성을 찾은 곳 (2019 노벨 물리학상).',
      'Where the first planet around a Sun-like star was found in 1995 (2019 Nobel Prize).',
    ),
  },
  {
    id: 'gliese710',
    name: both('글리제 710', 'Gliese 710'),
    ra: 274.0,
    dec: -1.94,
    distanceLy: 62,
    spectral: 'K7V',
    magnitude: 9.7,
    mass: 0.6,
    radius: 0.58,
    luminosity: 0.07,
    temperature: 4250,
    note: both(
      '태양 쪽으로 다가오는 중. 약 129만 년 뒤 1만 AU(0.17광년)까지 와서 오르트 구름을 흔듭니다.',
      'Heading our way: in ~1.29 million years it passes within 10,000 AU (0.17 ly), stirring the Oort cloud.',
    ),
  },
  {
    id: 'aldebaran',
    name: both('알데바란', 'Aldebaran'),
    ra: 68.98,
    dec: 16.51,
    distanceLy: 65,
    spectral: 'K5III',
    magnitude: 0.86,
    mass: 1.16,
    radius: 44,
    luminosity: 439,
    temperature: 3900,
    note: both(
      '황소자리의 붉은 눈인 적색 거성입니다.',
      'The red-giant eye of Taurus.',
    ),
  },
  {
    id: 'ik-pegasi',
    name: both('페가수스자리 IK', 'IK Pegasi'),
    ra: 321.611,
    dec: 19.376,
    distanceLy: 154,
    spectral: 'A8m + DA',
    magnitude: 6.08,
    mass: 1.65,
    radius: 1.6,
    luminosity: 8,
    temperature: 7700,
    note: both(
      '가장 가까운 Ia형 초신성 후보. 동반성인 무거운 백색 왜성이 질량을 얻으면 폭발할 수 있습니다.',
      'The nearest type Ia supernova candidate: its massive white-dwarf companion could explode.',
    ),
    blastId: 'ik-pegasi',
  },
  {
    id: 'spica',
    name: both('스피카', 'Spica'),
    ra: 201.298,
    dec: -11.161,
    distanceLy: 250,
    spectral: 'B1III-IV + B2V',
    magnitude: 0.97,
    mass: 11.4,
    radius: 7.5,
    luminosity: 20_500,
    temperature: 25_300,
    note: both(
      '무거운 쌍성. 주성은 언젠가 초신성이 됩니다.',
      'A massive binary whose primary will one day go supernova.',
    ),
    blastId: 'spica',
  },
  {
    id: 'canopus',
    name: both('카노푸스 (노인성)', 'Canopus'),
    ra: 95.988,
    dec: -52.696,
    distanceLy: 310,
    spectral: 'A9II',
    magnitude: -0.74,
    mass: 8,
    radius: 71,
    luminosity: 10_700,
    temperature: 7400,
    note: both(
      '밤하늘에서 두 번째로 밝은 별. 우리나라에서는 남쪽 지평선 가까이 낮게 보여 노인성이라 불렀습니다.',
      'The second-brightest star; seen low on the southern horizon from Korea, where it was called the Old Man Star.',
    ),
  },
  {
    id: 'polaris',
    name: both('폴라리스 (북극성)', 'Polaris'),
    ra: 37.95,
    dec: 89.26,
    distanceLy: 433,
    spectral: 'F7Ib',
    magnitude: 1.98,
    mass: 5.4,
    radius: 37.5,
    luminosity: 1260,
    temperature: 6015,
    note: both(
      '지금의 북극성. 세차 운동으로 1만 2천 년 뒤에는 베가가 그 자리를 잇습니다.',
      'Today’s pole star; precession hands the role to Vega in ~12,000 years.',
    ),
  },
  {
    id: 'betelgeuse',
    name: both('베텔게우스', 'Betelgeuse'),
    ra: 88.793,
    dec: 7.407,
    distanceLy: 548,
    spectral: 'M1-2Ia',
    magnitude: 0.5,
    mass: 18,
    radius: 764,
    luminosity: 100_000,
    temperature: 3600,
    note: both(
      '태양 자리에 두면 목성 궤도 근처까지 차는 적색 초거성. 2019~2020년 크게 어두워져 관심을 모았습니다.',
      'A red supergiant that would reach toward Jupiter’s orbit; its Great Dimming of 2019–2020 drew worldwide attention.',
    ),
    blastId: 'betelgeuse',
  },
  {
    id: 'antares',
    name: both('안타레스', 'Antares'),
    ra: 247.352,
    dec: -26.432,
    distanceLy: 550,
    spectral: 'M1.5Iab',
    magnitude: 1.06,
    mass: 12,
    radius: 680,
    luminosity: 75_000,
    temperature: 3570,
    note: both(
      '전갈자리의 심장. 화성과 겨룰 만큼 붉다는 뜻의 이름입니다.',
      'The heart of Scorpius; its name means “rival of Mars.”',
    ),
    blastId: 'antares',
  },
  {
    id: 'rigel',
    name: both('리겔', 'Rigel'),
    ra: 78.634,
    dec: -8.202,
    distanceLy: 860,
    spectral: 'B8Ia',
    magnitude: 0.13,
    mass: 21,
    radius: 79,
    luminosity: 120_000,
    temperature: 12_100,
    note: both('오리온자리의 푸른 초거성입니다.', 'Orion’s blue supergiant.'),
  },
  {
    id: 'deneb',
    name: both('데네브', 'Deneb'),
    ra: 310.358,
    dec: 45.28,
    distanceLy: 2600,
    spectral: 'A2Ia',
    magnitude: 1.25,
    mass: 19,
    radius: 203,
    luminosity: 196_000,
    temperature: 8525,
    note: both(
      '맨눈으로 보이는 별 가운데 가장 멀고 밝은 축에 듭니다.',
      'One of the most distant and luminous stars visible to the naked eye.',
    ),
  },
]

export const STAR_BY_ID = Object.fromEntries(
  STARS.map((s) => [s.id, s]),
) as Record<string, StarInfo>

/** 분광형 첫 글자로 별의 종류 */
/** 주성(첫 성분) 분광형에서 광도 계급 (Ia·Iab·Ib·I·II·III·IV·V, 없으면 null) */
export function luminosityClass(spectral: string): string | null {
  const primary = spectral.split('+')[0].trim()
  const m = primary.match(
    /^(?:sd)?[OBAFGKMLTYDW][A-Z]?[\d.-]*\s*(Iab|Ia|Ib|III|II|IV|V|I)?/,
  )
  return m?.[1] ?? null
}

/** 분광형 → 별의 종류 (광도 계급을 먼저 보고, 없거나 V이면 온도형으로 주계열 이름) */
export function starClassName(spectral: string): Text {
  const primary = spectral.split('+')[0].trim()
  if (primary.startsWith('sd')) return both('준왜성', 'Subdwarf')
  if (primary.startsWith('D')) return both('백색 왜성', 'White dwarf')
  const lum = luminosityClass(primary)
  if (lum === 'IV') return both('준거성', 'Subgiant')
  if (lum && lum !== 'V') return both('거성·초거성', 'Giant / supergiant')
  switch (primary[0]) {
    case 'O':
    case 'B':
      return both('푸른 주계열성', 'Blue main-sequence star')
    case 'A':
    case 'F':
      return both('흰색 주계열성', 'White main-sequence star')
    case 'G':
      return both(
        '노란 주계열성 (태양형)',
        'Yellow main-sequence star (Sun-like)',
      )
    case 'K':
      return both('주황 왜성', 'Orange dwarf')
    case 'M':
      return both('적색 왜성', 'Red dwarf')
    default:
      return both('별', 'Star')
  }
}
