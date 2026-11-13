import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  Points,
  Raycaster,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three'
import type { PerspectiveCamera } from 'three'
import { LOCAL_GALAXIES } from '../../../model/local/catalog'
import {
  advanceCollision,
  CATALOG_EPOCH_YEAR,
  createCollision,
  separation,
} from '../../../model/local/collision'
import type { Collision } from '../../../model/local/collision'
import { makeBlob, makeSpiralGalaxy } from '../../../lib/galaxyModel'
import { pointsVertex, starPointsFragment } from '../../../lib/shaders'
import { cloudPoints } from '../galaxy/GalaxyScene'
import {
  disposeObject,
  faceCamera,
  makeGlow,
  makeSelectionShell,
  makeSky,
  raDecToGalacticScene,
} from '../common'
import type { FrameContext, ScaleScene, Target } from '../types'

/** 장면 1 = 1만 광년 */
const UNIT_LY = 10_000
const PER_GALAXY = 7000

export function createLocalScene(): ScaleScene {
  const scene = new Scene()
  const sky = makeSky({
    radius: 30_000,
    stars: 1800,
    milkyWay: 0,
    seed: 41,
    frame: 'galactic',
  })
  scene.add(sky.group)

  const andromeda = LOCAL_GALAXIES.find((g) => g.id === 'andromeda')!
  const andromedaKly = raDecToGalacticScene(
    andromeda.ra,
    andromeda.dec,
    andromeda.distanceLy / 1000,
  )

  // 우리 은하·안드로메다: 충돌 모형의 별 (천 광년 단위라 0.1배)
  let collision: Collision | null = null
  const colors = new Float32Array(PER_GALAXY * 2 * 3)
  const sizes = new Float32Array(PER_GALAXY * 2)
  for (let i = 0; i < PER_GALAXY * 2; i++) {
    const warm = i >= PER_GALAXY
    const b = 0.45 + ((i * 2654435761) % 1000) / 1800
    colors.set(
      warm ? [1 * b, 0.84 * b, 0.62 * b] : [0.7 * b, 0.82 * b, 1 * b],
      i * 3,
    )
    sizes[i] = 0.7 + (((i * 40503) % 997) / 997) ** 4 * 2.4
  }
  const pairGeometry = new BufferGeometry()
  pairGeometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array(PER_GALAXY * 2 * 3), 3),
  )
  pairGeometry.setAttribute('aColor', new BufferAttribute(colors, 3))
  pairGeometry.setAttribute('aSize', new BufferAttribute(sizes, 1))
  const pair = new Points(
    pairGeometry,
    new ShaderMaterial({
      vertexShader: pointsVertex,
      fragmentShader: starPointsFragment,
      uniforms: {
        uPixelRatio: { value: 1 },
        uSize: { value: 420 },
        uOpacity: { value: 0.95 },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  )
  pair.scale.setScalar(1000 / UNIT_LY)
  pair.frustumCulled = false
  scene.add(pair)
  const sunMarker = makeGlow('#ffd27a', 1.4, 1.4)
  scene.add(sunMarker)
  const cores = [makeGlow('#c8d6ff', 9, 0.7), makeGlow('#ffd8a8', 11, 0.7)]
  scene.add(...cores)

  // 나머지 은하
  const markers = new Map<string, Group>()
  const pickables: Mesh[] = []
  LOCAL_GALAXIES.forEach((g, index) => {
    const group = new Group()
    if (g.id !== 'milky-way' && g.id !== 'andromeda') {
      group.position.copy(
        raDecToGalacticScene(g.ra, g.dec, g.distanceLy / UNIT_LY),
      )
      const r = Math.max(g.diameterLy / UNIT_LY / 2, 0.25)
      const cloud =
        g.type === 'spiral'
          ? makeSpiralGalaxy({
              count: 4000,
              seed: index + 5,
              radius: r,
              palette: 'cool',
            })
          : makeBlob(
              g.type === 'dwarf' ? 500 : 1800,
              index * 13 + 3,
              r,
              g.type === 'elliptical' ? [1, 0.86, 0.66] : [0.78, 0.86, 1],
              g.type === 'irregular' ? 0.7 : 1,
            )
      const points = cloudPoints(cloud, 420)
      const halo = makeGlow(
        g.type === 'elliptical' ? '#ffd8a8' : '#c8d6ff',
        Math.max(r * 3, 2.4),
        0.55,
      )
      group.add(halo)
      group.userData.glow = halo
      if (g.type === 'spiral') points.rotation.set(0.9, 0.3, 0.2)
      group.add(points)
    }
    const pick = new Mesh(
      new SphereGeometry(Math.max(g.diameterLy / UNIT_LY / 2, 1.5), 8, 6),
      new MeshBasicMaterial({ visible: false }),
    )
    pick.userData.id = g.id
    group.add(pick)
    pickables.push(pick)
    scene.add(group)
    markers.set(g.id, group)
  })

  const shell = makeSelectionShell()
  scene.add(shell)
  let lastInfo = -1

  const centerOf = (i: 0 | 1) =>
    collision
      ? new Vector3(...collision.galaxies[i].pos).multiplyScalar(1000 / UNIT_LY)
      : i === 0
        ? new Vector3()
        : andromedaKly.clone().multiplyScalar(1000 / UNIT_LY)

  const target = (id: string): Target | null => {
    if (id === 'milky-way') return { position: centerOf(0), radius: 6 }
    if (id === 'andromeda') return { position: centerOf(1), radius: 8 }
    const m = markers.get(id)
    const g = LOCAL_GALAXIES.find((x) => x.id === id)
    if (!m || !g) return null
    return {
      position: m.position.clone(),
      radius: Math.max(g.diameterLy / UNIT_LY / 2, 1.2),
    }
  }

  return {
    id: 'local',
    scene,
    near: 0.1,
    far: 80_000,
    overview: () => ({
      target: andromedaKly.clone().multiplyScalar(0.5 * (1000 / UNIT_LY)),
      distance: 330,
      elevation: 0.55,
    }),
    target,
    labelAnchor: (id: string, camera: PerspectiveCamera) => {
      const t = target(id)
      return t && camera.position.distanceTo(t.position) < 1600 ? t : null
    },
    pick(raycaster: Raycaster) {
      const hit = raycaster.intersectObjects(pickables, false)[0]
      return (hit?.object.userData.id as string | undefined) ?? null
    },
    update(ctx: FrameContext) {
      const year = ctx.world.year
      // 목록 시각에서 시작해 아래 advanceCollision이 프레임마다 나눠 따라잡음
      // (처음 연 시각에 따라 결과가 달라지지 않도록)
      if (!collision || year < collision.year - 1e6) {
        collision = createCollision({
          year: CATALOG_EPOCH_YEAR,
          andromeda: [andromedaKly.x, andromedaKly.y, andromedaKly.z],
          perGalaxy: PER_GALAXY,
          seed: 7,
        })
      }
      const caughtUp = advanceCollision(collision, year, 60)
      const attr = pairGeometry.attributes.position as BufferAttribute
      ;(attr.array as Float32Array).set(collision.pos)
      attr.needsUpdate = true
      const s = collision.sunIndex
      sunMarker.position
        .set(
          collision.pos[s * 3],
          collision.pos[s * 3 + 1],
          collision.pos[s * 3 + 2],
        )
        .multiplyScalar(1000 / UNIT_LY)
      faceCamera(sunMarker, ctx.camera)
      cores.forEach((core, i) => {
        core.position.copy(centerOf(i as 0 | 1))
        faceCamera(core, ctx.camera)
      })
      markers.get('milky-way')!.position.copy(centerOf(0))
      markers.get('andromeda')!.position.copy(centerOf(1))
      if (ctx.elapsed - lastInfo > 0.4) {
        lastInfo = ctx.elapsed
        // 정보 카드는 메인 스레드에 있으므로 엔진을 거쳐 알림
        ctx.reportCollision({
          separationLy: separation(collision) * 1000,
          merged: collision.merged,
          catchingUp: !caughtUp,
        })
      }
      ;(pair.material as ShaderMaterial).uniforms.uPixelRatio.value =
        ctx.pixelRatio
      for (const group of markers.values()) {
        const halo = group.userData.glow as typeof sunMarker | undefined
        if (halo) faceCamera(halo, ctx.camera)
      }
      for (const group of markers.values())
        for (const child of group.children)
          if (child instanceof Points)
            (child.material as ShaderMaterial).uniforms.uPixelRatio.value =
              ctx.pixelRatio
      const t = ctx.selected ? target(ctx.selected) : null
      shell.visible = Boolean(t)
      if (t) {
        shell.position.copy(t.position)
        shell.scale.setScalar(t.radius * 1.6)
        if (!ctx.reducedMotion) shell.rotation.y = ctx.elapsed * 0.06
      }
      ;(sky.stars.material as ShaderMaterial).uniforms.uPixelRatio.value =
        ctx.pixelRatio
    },
    dispose: () => disposeObject(scene),
  }
}
