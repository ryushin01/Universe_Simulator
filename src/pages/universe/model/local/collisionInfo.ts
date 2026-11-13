import { createSignal } from 'solid-js'

/** 3D 장면이 계산한 두 은하의 상태 (정보 카드 표시용) */
export interface CollisionInfo {
  /** 두 은하 중심 사이 거리 (광년) */
  separationLy: number
  merged: boolean
  /** 계산 중 (먼 미래로 건너뛴 뒤 따라잡는 중) */
  catchingUp: boolean
}

const [collisionInfo, setCollisionInfo] = createSignal<CollisionInfo | null>(
  null,
)

export { collisionInfo, setCollisionInfo }
