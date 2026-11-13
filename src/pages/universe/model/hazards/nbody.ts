import type { Vec3 } from '@/shared/lib'

/**
 * 태양 기준으로 다루는 N체 계산 상태 (단위: AU, 일, μ = GM [AU³/일²]).
 * 앞의 massiveCount개는 서로 끌어당기고, 나머지는 질량 없는 시험 입자입니다.
 */
export interface NBody {
  ids: string[]
  mu: Float64Array
  pos: Float64Array
  vel: Float64Array
  massiveCount: number
  jd: number
}

/** 근접 통과 때 발산을 막는 연화 길이² (약 4,500km) */
const SOFTENING2 = 1e-9

export function createNBody(
  bodies: Array<{ id: string; mu: number; r: Vec3; v: Vec3 }>,
  jd: number,
): NBody {
  const sorted = [...bodies].sort(
    (a, b) => (b.mu > 0 ? 1 : 0) - (a.mu > 0 ? 1 : 0),
  )
  const n = sorted.length
  const nb: NBody = {
    ids: sorted.map((b) => b.id),
    mu: new Float64Array(n),
    pos: new Float64Array(3 * n),
    vel: new Float64Array(3 * n),
    massiveCount: sorted.filter((b) => b.mu > 0).length,
    jd,
  }
  sorted.forEach((b, i) => {
    nb.mu[i] = b.mu
    nb.pos.set(b.r, 3 * i)
    nb.vel.set(b.v, 3 * i)
  })
  return nb
}

function accelerations(nb: NBody, acc: Float64Array) {
  acc.fill(0)
  const n = nb.ids.length
  const m = nb.massiveCount
  const { pos, mu } = nb
  for (let i = 0; i < n; i++) {
    const xi = pos[3 * i]
    const yi = pos[3 * i + 1]
    const zi = pos[3 * i + 2]
    // 질량 있는 천체끼리는 한 번만 계산해 양쪽에 더함
    for (let j = i < m ? i + 1 : 0; j < m; j++) {
      if (j === i) continue
      const dx = pos[3 * j] - xi
      const dy = pos[3 * j + 1] - yi
      const dz = pos[3 * j + 2] - zi
      const r2 = dx * dx + dy * dy + dz * dz + SOFTENING2
      const inv3 = 1 / (r2 * Math.sqrt(r2))
      acc[3 * i] += mu[j] * dx * inv3
      acc[3 * i + 1] += mu[j] * dy * inv3
      acc[3 * i + 2] += mu[j] * dz * inv3
      if (i < m) {
        acc[3 * j] -= mu[i] * dx * inv3
        acc[3 * j + 1] -= mu[i] * dy * inv3
        acc[3 * j + 2] -= mu[i] * dz * inv3
      }
    }
  }
}

// 요시다 4차 심플렉틱 적분 계수
const CBRT2 = Math.cbrt(2)
const W1 = 1 / (2 - CBRT2)
const W0 = -CBRT2 / (2 - CBRT2)
const C = [W1 / 2, (W0 + W1) / 2, (W0 + W1) / 2, W1 / 2]
const D = [W1, W0, W1]

const scratch = new Map<number, Float64Array>()
function accBuffer(size: number) {
  let buf = scratch.get(size)
  if (!buf) {
    buf = new Float64Array(size)
    scratch.set(size, buf)
  }
  return buf
}

/** dt(일)만큼 한 걸음 */
export function step(nb: NBody, dt: number) {
  const { pos, vel } = nb
  const acc = accBuffer(pos.length)
  for (let k = 0; k < 4; k++) {
    const c = C[k] * dt
    for (let i = 0; i < pos.length; i++) pos[i] += c * vel[i]
    if (k < 3) {
      accelerations(nb, acc)
      const d = D[k] * dt
      for (let i = 0; i < vel.length; i++) vel[i] += d * acc[i]
    }
  }
  nb.jd += dt
}

export const indexOf = (nb: NBody, id: string) => nb.ids.indexOf(id)

export const positionOf = (nb: NBody, index: number): Vec3 => [
  nb.pos[3 * index],
  nb.pos[3 * index + 1],
  nb.pos[3 * index + 2],
]

export const velocityOf = (nb: NBody, index: number): Vec3 => [
  nb.vel[3 * index],
  nb.vel[3 * index + 1],
  nb.vel[3 * index + 2],
]

/** center 기준 상대 위치·속도 */
export function relativeState(
  nb: NBody,
  index: number,
  center: number,
): { r: Vec3; v: Vec3 } {
  const r = positionOf(nb, index)
  const v = velocityOf(nb, index)
  const rc = positionOf(nb, center)
  const vc = velocityOf(nb, center)
  return {
    r: [r[0] - rc[0], r[1] - rc[1], r[2] - rc[2]],
    v: [v[0] - vc[0], v[1] - vc[1], v[2] - vc[2]],
  }
}

/** 계 전체 에너지 (검사용) */
export function totalEnergy(nb: NBody): number {
  const n = nb.ids.length
  let kinetic = 0
  let potential = 0
  for (let i = 0; i < nb.massiveCount; i++) {
    const v = velocityOf(nb, i)
    kinetic += 0.5 * nb.mu[i] * (v[0] ** 2 + v[1] ** 2 + v[2] ** 2)
    for (let j = i + 1; j < nb.massiveCount; j++) {
      const a = positionOf(nb, i)
      const b = positionOf(nb, j)
      const r = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
      potential -= (nb.mu[i] * nb.mu[j]) / r
    }
  }
  return n > 0 ? kinetic + potential : 0
}
