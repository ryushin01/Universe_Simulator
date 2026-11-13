import { gaussian, seededRandom } from '@/shared/lib'
import type { Vec3 } from '@/shared/lib'
import { NOW_YEAR } from '../solar/sun'

/**
 * 은하 목록의 위치·속도가 가리키는 시각. 충돌은 언제 이 규모를 처음 열든
 * 이 시각에서 시작해 시뮬레이션 날짜까지 따라잡습니다.
 */
export const CATALOG_EPOCH_YEAR = NOW_YEAR

/**
 * 우리 은하와 안드로메다의 충돌 (제한된 N체, Toomre & Toomre 방식).
 * 두 은하의 중심은 플러머 퍼텐셜끼리 끌어당기고, 헤일로가 겹치면 역학적 마찰로 느려져 합쳐집니다.
 * 원반의 별은 두 중심의 중력만 받는 시험 입자입니다.
 * 단위: 천 광년(kly), 백만 년(Myr), 질량은 태양 질량.
 */
export const G_KLY = 1.561e-10

export interface Galaxy {
  mass: number
  softening: number
  pos: Vec3
  vel: Vec3
}

export interface Collision {
  /** 계산한 마지막 시각 (소수 연도) */
  year: number
  galaxies: [Galaxy, Galaxy]
  /** 별 위치·속도 (앞쪽 절반은 우리 은하, 뒤쪽 절반은 안드로메다) */
  pos: Float32Array
  vel: Float32Array
  perGalaxy: number
  /** 태양으로 표시할 별 */
  sunIndex: number
  /** 두 은하가 합쳐졌는지 */
  merged: boolean
}

const STEP_MYR = 2

/** 안드로메다 방향(은하 좌표 장면)과 거리 */
export function createCollision(options: {
  year: number
  andromeda: Vec3
  perGalaxy: number
  seed: number
}): Collision {
  const random = seededRandom(options.seed)
  const mw: Galaxy = {
    mass: 0.8e12,
    softening: 60,
    pos: [0, 0, 0],
    vel: [0, 0, 0],
  }
  const dist = Math.hypot(...options.andromeda)
  const dir: Vec3 = [
    options.andromeda[0] / dist,
    options.andromeda[1] / dist,
    options.andromeda[2] / dist,
  ]
  // 시선 방향으로 초속 110km 접근, 옆으로 조금 비켜 감 (중심끼리 정면 충돌하지 않게)
  const radial = -110 / 293
  const side: Vec3 = [dir[2], 0, -dir[0]]
  const sideLen = Math.hypot(...side) || 1
  const tangential = 22 / 293
  const m31: Galaxy = {
    mass: 1.05e12,
    softening: 65,
    pos: [...options.andromeda] as Vec3,
    vel: [
      dir[0] * radial + (side[0] / sideLen) * tangential,
      dir[1] * radial,
      dir[2] * radial + (side[2] / sideLen) * tangential,
    ],
  }
  // 운동량이 0이 되도록 질량 중심 기준
  const total = mw.mass + m31.mass
  for (let k = 0; k < 3; k++) {
    const v = (mw.mass * mw.vel[k] + m31.mass * m31.vel[k]) / total
    mw.vel[k] -= v
    m31.vel[k] -= v
  }
  const n = options.perGalaxy
  const pos = new Float32Array(n * 2 * 3)
  const vel = new Float32Array(n * 2 * 3)
  // 안드로메다 원반은 기울어져 있음 (법선 벡터)
  const normals: Vec3[] = [
    [0, 1, 0],
    [0.62, 0.55, 0.56],
  ]
  ;[mw, m31].forEach((g, gi) => {
    const nrm = normals[gi]
    const len = Math.hypot(...nrm)
    const N: Vec3 = [nrm[0] / len, nrm[1] / len, nrm[2] / len]
    // 원반 면의 두 축
    const ref: Vec3 = Math.abs(N[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
    const e1: Vec3 = normalize(cross(ref, N))
    const e2: Vec3 = cross(N, e1)
    const scaleLength = gi === 0 ? 12 : 16
    for (let i = 0; i < n; i++) {
      const r = Math.min(-Math.log(1 - random() * 0.97) * scaleLength + 2, 75)
      const theta = random() * Math.PI * 2
      const h = gaussian(random) * 0.8
      const local: Vec3 = [
        r * Math.cos(theta) * e1[0] + r * Math.sin(theta) * e2[0] + h * N[0],
        r * Math.cos(theta) * e1[1] + r * Math.sin(theta) * e2[1] + h * N[1],
        r * Math.cos(theta) * e1[2] + r * Math.sin(theta) * e2[2] + h * N[2],
      ]
      // 플러머 퍼텐셜의 원 궤도 속도
      const v = Math.sqrt(
        (G_KLY * g.mass * r * r) / (r * r + g.softening ** 2) ** 1.5,
      )
      const tangent: Vec3 = normalize(cross(N, local))
      const idx = gi * n + i
      pos.set(
        [g.pos[0] + local[0], g.pos[1] + local[1], g.pos[2] + local[2]],
        idx * 3,
      )
      vel.set(
        [
          g.vel[0] + tangent[0] * v,
          g.vel[1] + tangent[1] * v,
          g.vel[2] + tangent[2] * v,
        ],
        idx * 3,
      )
    }
  })
  // 태양: 우리 은하 중심에서 약 2만 6천 광년인 별
  let sunIndex = 0
  let best = Infinity
  for (let i = 0; i < n; i++) {
    const d = Math.abs(Math.hypot(pos[i * 3], pos[i * 3 + 2]) - 26.7)
    if (d < best) {
      best = d
      sunIndex = i
    }
  }
  return {
    year: options.year,
    galaxies: [mw, m31],
    pos,
    vel,
    perGalaxy: n,
    sunIndex,
    merged: false,
  }
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}

function normalize(a: Vec3): Vec3 {
  const l = Math.hypot(...a) || 1
  return [a[0] / l, a[1] / l, a[2] / l]
}

function plummer(g: Galaxy, x: number, y: number, z: number, out: number[]) {
  const dx = g.pos[0] - x
  const dy = g.pos[1] - y
  const dz = g.pos[2] - z
  const r2 = dx * dx + dy * dy + dz * dz + g.softening * g.softening
  const f = (G_KLY * g.mass) / (r2 * Math.sqrt(r2))
  out[0] += f * dx
  out[1] += f * dy
  out[2] += f * dz
}

/** 한 걸음 (반쪽 킥-드리프트-반쪽 킥) */
function stepCollision(c: Collision, dt: number) {
  const [a, b] = c.galaxies
  // 두 중심: 서로 끌어당기고 헤일로가 겹치면 역학적 마찰
  const acc = (from: Galaxy, to: Galaxy) => {
    const out = [0, 0, 0]
    plummer(to, from.pos[0], from.pos[1], from.pos[2], out)
    const d = Math.hypot(
      to.pos[0] - from.pos[0],
      to.pos[1] - from.pos[1],
      to.pos[2] - from.pos[2],
    )
    const rel = [
      from.vel[0] - to.vel[0],
      from.vel[1] - to.vel[1],
      from.vel[2] - to.vel[2],
    ]
    const drag = d < 250 ? 0.0011 * (1 - d / 250) * (to.mass / 1e12) : 0
    return [
      out[0] - drag * rel[0],
      out[1] - drag * rel[1],
      out[2] - drag * rel[2],
    ]
  }
  const aa = acc(a, b)
  const ab = acc(b, a)
  for (let k = 0; k < 3; k++) {
    a.vel[k] += aa[k] * dt
    b.vel[k] += ab[k] * dt
    a.pos[k] += a.vel[k] * dt
    b.pos[k] += b.vel[k] * dt
  }
  const { pos, vel } = c
  const out = [0, 0, 0]
  for (let i = 0; i < pos.length / 3; i++) {
    out[0] = out[1] = out[2] = 0
    const x = pos[i * 3]
    const y = pos[i * 3 + 1]
    const z = pos[i * 3 + 2]
    plummer(a, x, y, z, out)
    plummer(b, x, y, z, out)
    vel[i * 3] += out[0] * dt
    vel[i * 3 + 1] += out[1] * dt
    vel[i * 3 + 2] += out[2] * dt
    pos[i * 3] += vel[i * 3] * dt
    pos[i * 3 + 1] += vel[i * 3 + 1] * dt
    pos[i * 3 + 2] += vel[i * 3 + 2] * dt
  }
  if (
    Math.hypot(a.pos[0] - b.pos[0], a.pos[1] - b.pos[1], a.pos[2] - b.pos[2]) <
    15
  )
    c.merged = true
}

/** year까지 진행 (한 번에 최대 maxSteps). 다 따라잡으면 true */
export function advanceCollision(
  c: Collision,
  year: number,
  maxSteps = 120,
): boolean {
  let steps = 0
  while (c.year + STEP_MYR * 1e6 <= year && steps < maxSteps) {
    stepCollision(c, STEP_MYR)
    c.year += STEP_MYR * 1e6
    steps++
  }
  return c.year + STEP_MYR * 1e6 > year
}

/** 두 은하 중심 사이 거리 (천 광년) */
export const separation = (c: Collision) => {
  const [a, b] = c.galaxies
  return Math.hypot(
    a.pos[0] - b.pos[0],
    a.pos[1] - b.pos[1],
    a.pos[2] - b.pos[2],
  )
}
