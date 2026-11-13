import { gaussian, seededRandom } from '@/shared/lib'

export interface ParticleCloud {
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  count: number
}

/**
 * 막대 나선 은하 모형 (단위: 천 광년, 장면 좌표: 은하면 = XZ, 위 = Y).
 * 막대와 팽대부, 대수 나선팔 4개(피치각 12°), 얇은 원반, 태양이 있는 오리온 돌출부.
 */
export function makeSpiralGalaxy(options: {
  count: number
  seed: number
  radius: number
  /** 막대 방향 (라디안) */
  barAngle?: number
  palette?: 'milkyWay' | 'warm' | 'cool'
  spur?: boolean
}): ParticleCloud {
  const { count, radius } = options
  const random = seededRandom(options.seed)
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const pitch = (12 * Math.PI) / 180
  const k = 1 / Math.tan(pitch)
  const r0 = radius * 0.24
  const bar = options.barAngle ?? 0.47
  const tint =
    options.palette === 'warm'
      ? [1.0, 0.86, 0.7]
      : options.palette === 'cool'
        ? [0.75, 0.85, 1.0]
        : [0.9, 0.93, 1.0]
  for (let i = 0; i < count; i++) {
    const u = random()
    let x: number
    let y: number
    let z: number
    let young = 0
    if (u < 0.18) {
      // 막대와 팽대부: 늙은 노란 별
      const along = gaussian(random) * radius * 0.16
      const across = gaussian(random) * radius * 0.06
      x = along * Math.cos(bar) - across * Math.sin(bar)
      z = along * Math.sin(bar) + across * Math.cos(bar)
      y = gaussian(random) * radius * 0.045
    } else if (u < 0.88) {
      // 나선팔 4개
      const arm = Math.floor(random() * 4)
      const r = r0 + (-Math.log(1 - random() * 0.95) / 2.6) * radius
      if (r > radius * 1.05) {
        i--
        continue
      }
      const theta = Math.log(r / r0) * k + (arm * Math.PI) / 2 + bar
      const spread = radius * (0.018 + 0.012 * random()) * (1 + r / radius)
      x = r * Math.cos(theta) + gaussian(random) * spread
      z = r * Math.sin(theta) + gaussian(random) * spread
      y = gaussian(random) * radius * 0.012
      young =
        Math.exp(-((gaussian(random) * 0.7) ** 2)) * (arm % 2 === 0 ? 1 : 0.7)
    } else if (u < 0.895 && options.spur) {
      // 오리온 돌출부 (태양 근처): 폭 약 3,500광년, 길이 약 1만 광년.
      // 너무 좁고 촘촘하면 태양 옆의 흰 줄기처럼 보이므로 나선팔과 비슷한 밀도로
      const t = random()
      const theta = Math.PI + 0.05 + t * 0.35
      const r = radius * (0.5 + t * 0.06) + gaussian(random) * radius * 0.03
      x = r * Math.cos(theta) + gaussian(random) * radius * 0.012
      z = -r * Math.sin(theta) * 0.98
      y = gaussian(random) * radius * 0.012
      young = 0.8
    } else {
      // 팔 사이 원반
      const r = (-Math.log(1 - random() * 0.97) / 3) * radius
      const theta = random() * Math.PI * 2
      x = r * Math.cos(theta)
      z = r * Math.sin(theta)
      y = gaussian(random) * radius * 0.02
    }
    positions.set([x, y, z], i * 3)
    const old = [1.0, 0.82, 0.58]
    const blue = [0.62, 0.78, 1.0]
    const pink = [1.0, 0.45, 0.62]
    const hii = young > 0.85 && random() < 0.08
    const c = hii ? pink : old.map((v, j) => v + (blue[j] - v) * young)
    const brightness = (0.4 + random() * 0.6) * (young > 0.3 ? 1.35 : 0.85)
    colors.set(
      [
        c[0] * tint[0] * brightness,
        c[1] * tint[1] * brightness,
        c[2] * tint[2] * brightness,
      ],
      i * 3,
    )
    sizes[i] = (hii ? 2.4 : 1) * (0.6 + random() ** 4 * 2.4)
  }
  return { positions, colors, sizes, count }
}

/** 불규칙·왜소 은하: 덩어리진 구름 */
export function makeBlob(
  count: number,
  seed: number,
  radius: number,
  color: [number, number, number],
  flatten = 0.5,
): ParticleCloud {
  const random = seededRandom(seed)
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const clumps = Array.from({ length: 5 }, () => [
    gaussian(random) * radius * 0.4,
    gaussian(random) * radius * 0.2 * flatten,
    gaussian(random) * radius * 0.4,
  ])
  for (let i = 0; i < count; i++) {
    const c = clumps[Math.floor(random() * clumps.length)]
    positions.set(
      [
        c[0] + gaussian(random) * radius * 0.35,
        c[1] + gaussian(random) * radius * 0.18 * flatten,
        c[2] + gaussian(random) * radius * 0.35,
      ],
      i * 3,
    )
    const b = 0.5 + random() * 0.5
    colors.set([color[0] * b, color[1] * b, color[2] * b], i * 3)
    sizes[i] = 0.6 + random() ** 3 * 2
  }
  return { positions, colors, sizes, count }
}
