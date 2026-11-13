import {
  BufferGeometry,
  Color,
  Group,
  Line,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three'
import type { PerspectiveCamera } from 'three'
import { clamp } from '@/shared/lib'
import { STARS } from '../../../model/stars/catalog'
import { destinationsOf } from '../../../model/objects'
import { blackbodyColor } from '../../../model/solar/sun'
import {
  disposeObject,
  faceCamera,
  makeGlow,
  makeSelectionShell,
  makeSky,
  raDecToScene,
} from '../common'
import type { FrameContext, ScaleScene, Target } from '../types'

const MAJOR = new Set(destinationsOf('stars').map((o) => o.id))

/** 거리 압축: 장면 반지름 = 6·√(광년) */
const sceneRadius = (ly: number) => 6 * Math.sqrt(ly)

interface StarVisual {
  id: string
  group: Group
  glow: Mesh
  core: Mesh
  pick: Mesh
  stem: Line
  base: Vector3
  size: number
  /** 폭발 전 빛깔 (처음으로 돌리거나 폭발 전 저장을 불러오면 되돌림) */
  color: Color
  blastId?: string
  /** 폭발 모습으로 바꿨는지 */
  exploded?: boolean
}

const lineMaterial = (color: string, opacity: number) =>
  new LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
  })

export function createStarsScene(): ScaleScene {
  const scene = new Scene()
  const sky = makeSky({
    radius: 12_000,
    stars: 3200,
    milkyWay: 0.85,
    seed: 17,
    frame: 'ecliptic',
  })
  scene.add(sky.group)

  // 거리 고리 (황도면): Space Advisor의 가는 궤도선처럼
  for (const ly of [5, 10, 25, 50, 100, 250, 500, 1000]) {
    const r = sceneRadius(ly)
    const ring = new LineLoop(
      new BufferGeometry().setFromPoints(
        Array.from(
          { length: 128 },
          (_, i) =>
            new Vector3(
              Math.cos((i / 128) * Math.PI * 2) * r,
              0,
              Math.sin((i / 128) * Math.PI * 2) * r,
            ),
        ),
      ),
      lineMaterial('#7c9cff', ly >= 100 ? 0.16 : 0.22),
    )
    scene.add(ring)
  }

  // 태양과 오르트 구름 (약 1.5광년)
  const sun = makeGlow('#ffd27a', 5, 1.3, 0.5)
  const sunCore = new Mesh(
    new SphereGeometry(0.6, 24, 12),
    new MeshBasicMaterial({ color: '#ffe2a0' }),
  )
  const sunPick = new Mesh(
    new SphereGeometry(2, 8, 6),
    new MeshBasicMaterial({ visible: false }),
  )
  sunPick.userData.id = 'sun'
  const oort = new LineLoop(
    new BufferGeometry().setFromPoints(
      Array.from({ length: 96 }, (_, i) =>
        new Vector3(
          Math.cos((i / 96) * Math.PI * 2),
          0,
          Math.sin((i / 96) * Math.PI * 2),
        ).multiplyScalar(sceneRadius(1.5)),
      ),
    ),
    lineMaterial('#a9bdff', 0.35),
  )
  scene.add(sun, sunCore, sunPick, oort)

  const visuals = new Map<string, StarVisual>()
  const pickables: Mesh[] = [sunPick]
  for (const star of STARS) {
    const dir = raDecToScene(star.ra, star.dec)
    const base = dir.clone().multiplyScalar(sceneRadius(star.distanceLy))
    const [r, g, b] = blackbodyColor(star.temperature)
    const color = new Color(r, g, b)
    const size = clamp(1.2 + Math.log10(star.luminosity + 1e-4) * 0.7, 0.6, 5.5)
    const group = new Group()
    group.position.copy(base)
    const glow = makeGlow(color, size * 4, 1, 0.35)
    const core = new Mesh(
      new SphereGeometry(size * 0.18, 16, 8),
      new MeshBasicMaterial({ color }),
    )
    const pick = new Mesh(
      new SphereGeometry(Math.max(size * 0.8, 2.2), 8, 6),
      new MeshBasicMaterial({ visible: false }),
    )
    pick.userData.id = star.id
    group.add(glow, core, pick)
    // 황도면까지 내린 줄기 (입체감)
    const stem = new Line(
      new BufferGeometry().setFromPoints([
        new Vector3(0, 0, 0),
        new Vector3(0, -base.y, 0),
      ]),
      lineMaterial('#7c9cff', 0.25),
    )
    group.add(stem)
    scene.add(group)
    pickables.push(pick)
    visuals.set(star.id, {
      id: star.id,
      group,
      glow,
      core,
      pick,
      stem,
      base,
      size,
      color,
      blastId: star.blastId,
    })
  }

  // 글리제 710의 앞날: 태양 쪽으로 다가오는 길
  const g710 = visuals.get('gliese710')
  const g710Path = new Line(new BufferGeometry(), lineMaterial('#ff9a9a', 0.55))
  if (g710) {
    const end = g710.base
      .clone()
      .normalize()
      .multiplyScalar(sceneRadius(0.17))
      .applyAxisAngle(new Vector3(0, 1, 0), 0.4)
    g710Path.geometry.setFromPoints([g710.base.clone(), end])
  }
  scene.add(g710Path)

  const shell = makeSelectionShell()
  scene.add(shell)
  const flareStart = new Map<number, number>()

  const target = (id: string): Target | null => {
    if (id === 'sun') return { position: new Vector3(0, 0, 0), radius: 2.5 }
    const v = visuals.get(id)
    return v
      ? { position: v.group.position.clone(), radius: Math.max(v.size, 1.6) }
      : null
  }

  return {
    id: 'stars',
    scene,
    near: 0.05,
    far: 40_000,
    overview: () => ({
      target: new Vector3(0, 0, 0),
      distance: 300,
      elevation: 0.5,
    }),
    target,
    labelAnchor: (id: string, camera: PerspectiveCamera) => {
      const t = target(id)
      if (!t) return null
      // 멀리서 볼 때는 주요 별만 이름을 붙여 겹침을 줄임
      const d = camera.position.distanceTo(t.position)
      return d < 90 || (MAJOR.has(id) && d < 900) ? t : null
    },
    pick(raycaster: Raycaster) {
      const hit = raycaster.intersectObjects(pickables, false)[0]
      return (hit?.object.userData.id as string | undefined) ?? null
    },
    update(ctx: FrameContext) {
      // 세계가 바뀌어 사라진 폭발의 시작 시각은 지움 (새 폭발이 같은 id를 받을 수 있음)
      for (const id of flareStart.keys())
        if (!ctx.world.blasts.some((b) => b.id === id)) flareStart.delete(id)
      faceCamera(sun, ctx.camera)
      for (const v of visuals.values()) {
        faceCamera(v.glow, ctx.camera)
        // 초신성이 된 별은 몇 초 동안 밝게 타오르고 잔해로 남음
        const blast = v.blastId
          ? ctx.world.blasts.find((b) => b.sourceId === v.blastId)
          : undefined
        const u = (v.glow.material as ShaderMaterial).uniforms
        if (blast) {
          if (!flareStart.has(blast.id)) flareStart.set(blast.id, ctx.elapsed)
          const t = ctx.elapsed - flareStart.get(blast.id)!
          const flare = Math.exp(-t / 3) * 6 + 1.2
          v.glow.scale.setScalar(v.size * 4 * flare)
          u.uIntensity.value = 1.4
          u.uColor.value.set('#e8f0ff')
          v.core.visible = false
          v.exploded = true
        } else if (v.exploded) {
          // 폭발 기록이 없는 세계(처음으로·불러오기)로 바뀌면 원래 별로
          v.glow.scale.setScalar(v.size * 4)
          u.uIntensity.value = 1
          u.uColor.value.copy(v.color)
          v.core.visible = true
          v.exploded = false
        }
      }
      const t = ctx.selected ? target(ctx.selected) : null
      shell.visible = Boolean(t)
      if (t) {
        shell.position.copy(t.position)
        shell.scale.setScalar(t.radius * 2.2)
        if (!ctx.reducedMotion) shell.rotation.y = ctx.elapsed * 0.08
      }
      ;(sky.stars.material as ShaderMaterial).uniforms.uPixelRatio.value =
        ctx.pixelRatio
    },
    dispose: () => disposeObject(scene),
  }
}
