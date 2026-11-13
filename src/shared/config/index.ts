/** 배포 경로 접두사 (GitHub Pages에서는 /Universe_Simulator/) */
export const BASE = import.meta.env.BASE_URL

/** public 폴더의 파일 주소 */
export const asset = (path: string) => `${BASE}${path.replace(/^\//, '')}`

/** 화면이 좁거나 기기 메모리가 적으면 작은 텍스처를 씀 */
export function prefersSmallTextures(): boolean {
  if (typeof window === 'undefined') return false
  const memory = (navigator as Navigator & { deviceMemory?: number })
    .deviceMemory
  return (
    window.matchMedia('(max-width: 767px)').matches ||
    (memory !== undefined && memory <= 2)
  )
}

export const REPOSITORY_URL = 'https://github.com/ryushin01/Universe_Simulator'
