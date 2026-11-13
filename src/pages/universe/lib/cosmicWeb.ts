import { gaussian, seededRandom } from '@/shared/lib'

export interface CosmicWeb {
  count: number
  /** 처음 (라그랑주) 위치 (백만 광년) */
  q: Float32Array
  /** 성장 인자 1일 때의 변위 */
  psi: Float32Array
  /** 변위의 발산 (밀도 대비 = −D·∇·ψ) */
  divergence: Float32Array
}

/**
 * 젤도비치 근사로 만든 우주 거미줄: x = q + D(t)·ψ(q).
 * ψ는 무작위 위상의 평면파를 더한 퍼텐셜 흐름(파동 방향과 나란한 변위)이라
 * 시간이 갈수록 물질이 판(장성)·실(필라멘트)·덩어리(은하단)로 모이고 사이가 비어(공동) 갑니다.
 */
export function makeCosmicWeb(options: {
  grid: number
  box: number
  modes: number
  seed: number
  strength: number
}): CosmicWeb {
  const { grid, box } = options
  const random = seededRandom(options.seed)
  const count = grid ** 3
  const spacing = box / grid
  const kMin = (2 * Math.PI) / (box * 0.6)
  const kMax = (2 * Math.PI) / (spacing * 2.2)
  const modes = Array.from({ length: options.modes }, () => {
    const k = kMin * (kMax / kMin) ** random()
    const z = random() * 2 - 1
    const t = random() * Math.PI * 2
    const s = Math.sqrt(1 - z * z)
    // 변위 진폭 ∝ k^−1.6 (긴 파장이 큰 구조를 만듦)
    return {
      kx: k * s * Math.cos(t),
      ky: k * z,
      kz: k * s * Math.sin(t),
      k,
      amp: k ** -1.6,
      phase: random() * Math.PI * 2,
    }
  })
  const q = new Float32Array(count * 3)
  const psi = new Float32Array(count * 3)
  const divergence = new Float32Array(count)
  let i = 0
  for (let a = 0; a < grid; a++)
    for (let b = 0; b < grid; b++)
      for (let c = 0; c < grid; c++) {
        // 격자에 약간의 흔들림을 줘 줄무늬가 보이지 않게
        const x = (a + 0.5 + gaussian(random) * 0.15) * spacing - box / 2
        const y = (b + 0.5 + gaussian(random) * 0.15) * spacing - box / 2
        const z = (c + 0.5 + gaussian(random) * 0.15) * spacing - box / 2
        q.set([x, y, z], i * 3)
        let px = 0
        let py = 0
        let pz = 0
        let div = 0
        for (const m of modes) {
          const arg = m.kx * x + m.ky * y + m.kz * z + m.phase
          const cos = Math.cos(arg)
          const amp = m.amp / m.k
          px += amp * m.kx * cos
          py += amp * m.ky * cos
          pz += amp * m.kz * cos
          div -= m.amp * m.k * Math.sin(arg)
        }
        psi.set([px, py, pz], i * 3)
        divergence[i] = div
        i++
      }
  // 변위의 크기를 격자 간격에 맞춰 정규화
  let sum = 0
  for (let j = 0; j < count; j++)
    sum += psi[j * 3] ** 2 + psi[j * 3 + 1] ** 2 + psi[j * 3 + 2] ** 2
  const rms = Math.sqrt(sum / count)
  const scale = (options.strength * spacing) / rms
  for (let j = 0; j < count * 3; j++) psi[j] *= scale
  for (let j = 0; j < count; j++) divergence[j] *= scale
  return { count, q, psi, divergence }
}
