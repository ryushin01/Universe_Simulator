import {
  AdditiveBlending,
  BufferAttribute,
  Color,
  BufferGeometry,
  Group,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Points,
  Raycaster,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three'
import type { PerspectiveCamera } from 'three'
import {
  GALAXY_OBJECTS,
  GALACTIC_YEAR,
  SUN_GALACTOCENTRIC_LY,
} from '../../../model/galaxy/catalog'
import { makeBlob, makeSpiralGalaxy } from '../../../lib/galaxyModel'
import type { ParticleCloud } from '../../../lib/galaxyModel'
import {
  blackHoleFragment,
  glowVertex,
  pointsVertex,
  shellFragment,
  shellVertex,
  starPointsFragment,
} from '../../../lib/shaders'
import {
  disposeObject,
  faceCamera,
  makeGlow,
  makeSelectionShell,
  makeSky,
  raDecToGalacticScene,
} from '../common'
import type { FrameContext, ScaleScene, Target } from '../types'

const FAR_LABELS = new Set([
  'sun',
  'sgr-a',
  'lmc',
  'smc',
  'omega-centauri',
  'sgr1806',
  'eta-carinae',
])

/** 장면 1 = 천 광년 */
const KLY = 1000
const SUN_R = SUN_GALACTOCENTRIC_LY / KLY

export function cloudPoints(cloud: ParticleCloud, size: number) {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(cloud.positions, 3))
  geometry.setAttribute('aColor', new BufferAttribute(cloud.colors, 3))
  geometry.setAttribute('aSize', new BufferAttribute(cloud.sizes, 1))
  const points = new Points(
    geometry,
    new ShaderMaterial({
      vertexShader: pointsVertex,
      fragmentShader: starPointsFragment,
      uniforms: {
        uPixelRatio: { value: 1 },
        uSize: { value: size },
        uOpacity: { value: 0.9 },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  )
  points.frustumCulled = false
  return points
}

export function createGalaxyScene(): ScaleScene {
  const scene = new Scene()
  const sky = makeSky({
    radius: 20_000,
    stars: 1500,
    milkyWay: 0,
    seed: 29,
    frame: 'galactic',
  })
  scene.add(sky.group)

  // 은하 원반은 태양과 함께 돔 (은하 1년 2억 3천만 년)
  const disk = new Group()
  scene.add(disk)
  const milkyWay = cloudPoints(
    makeSpiralGalaxy({
      count: 70_000,
      seed: 3,
      radius: 52,
      barAngle: 0.47,
      spur: true,
    }),
    230,
  )
  disk.add(milkyWay)
  // 같은 모양의 크고 흐린 입자층을 겹쳐 나선팔이 빛나 보이게
  const armGlow = cloudPoints(
    makeSpiralGalaxy({
      count: 9000,
      seed: 8,
      radius: 52,
      barAngle: 0.47,
      spur: true,
    }),
    1500,
  )
  ;(armGlow.material as ShaderMaterial).uniforms.uOpacity.value = 0.09
  disk.add(armGlow)
  const bulgeGlow = makeGlow('#ffd9a8', 26, 0.4)
  disk.add(bulgeGlow)

  // 은하 중심 블랙홀
  const hole = new Mesh(
    new PlaneGeometry(1, 1),
    new ShaderMaterial({
      vertexShader: glowVertex,
      fragmentShader: blackHoleFragment,
      uniforms: { uTime: { value: 0 }, uDisk: { value: 0.8 } },
      transparent: true,
      depthWrite: false,
    }),
  )
  hole.scale.setScalar(3)
  hole.renderOrder = 6
  disk.add(hole)

  // 페르미 거품: 은하 중심 위아래로 2만 5천 광년
  for (const sign of [1, -1]) {
    const bubble = new Mesh(
      new SphereGeometry(1, 32, 16),
      new ShaderMaterial({
        vertexShader: shellVertex,
        fragmentShader: shellFragment,
        uniforms: {
          uColor: { value: new Color('#7fd0ff') },
          uOpacity: { value: 0.18 },
          uTime: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    )
    bubble.scale.set(9, 13, 9)
    bubble.position.set(0, sign * 13, 0)
    disk.add(bubble)
  }

  // 태양의 공전 궤도와 표지
  const orbit = new LineLoop(
    new BufferGeometry().setFromPoints(
      Array.from(
        { length: 160 },
        (_, i) =>
          new Vector3(
            Math.cos((i / 160) * Math.PI * 2) * SUN_R,
            0,
            Math.sin((i / 160) * Math.PI * 2) * SUN_R,
          ),
      ),
    ),
    new LineBasicMaterial({
      color: '#ffd27a',
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    }),
  )
  disk.add(orbit)

  const markers = new Map<string, Group>()
  const pickables: Mesh[] = []
  for (const obj of GALAXY_OBJECTS) {
    const group = new Group()
    let pos: Vector3
    if (obj.id === 'sun') pos = new Vector3(-SUN_R, 0.065, 0)
    else {
      // 태양 기준 은하 좌표 + 태양의 은하 중심 기준 위치
      pos = raDecToGalacticScene(obj.ra!, obj.dec!, obj.distanceLy / KLY).add(
        new Vector3(-SUN_R, 0.065, 0),
      )
    }
    group.position.copy(pos)
    const color =
      obj.kind === 'sun'
        ? '#ffd27a'
        : obj.kind === 'blackHole'
          ? '#ffb070'
          : obj.kind === 'nebula' || obj.kind === 'remnant'
            ? '#ff8ac8'
            : obj.kind === 'satellite'
              ? '#c8d4ff'
              : '#9fd6ff'
    const glow = makeGlow(color, obj.kind === 'sun' ? 2.2 : 1.6, 1.1)
    group.add(glow)
    group.userData.glow = glow
    if (obj.kind === 'satellite')
      group.add(
        cloudPoints(
          makeBlob(
            2500,
            obj.id.length * 7,
            obj.id === 'lmc' ? 8 : 5,
            [0.75, 0.82, 1],
          ),
          60,
        ),
      )
    const pick = new Mesh(
      new SphereGeometry(obj.kind === 'satellite' ? 6 : 1.6, 8, 6),
      new MeshBasicMaterial({ visible: false }),
    )
    pick.userData.id = obj.id
    group.add(pick)
    pickables.push(pick)
    disk.add(group)
    markers.set(obj.id, group)
  }

  const shell = makeSelectionShell()
  scene.add(shell)
  let heldAngle = 0

  const target = (id: string): Target | null => {
    const m = markers.get(id)
    if (!m) return null
    const radius = id === 'lmc' || id === 'smc' ? 8 : id === 'sgr-a' ? 3 : 1.5
    return { position: m.getWorldPosition(new Vector3()), radius }
  }

  return {
    id: 'galaxy',
    scene,
    near: 0.05,
    far: 60_000,
    overview: () => ({
      target: new Vector3(0, 0, 0),
      distance: 140,
      elevation: 1.1,
    }),
    target,
    labelAnchor: (id: string, camera: PerspectiveCamera) => {
      const t = target(id)
      if (!t) return null
      // 멀리서는 태양 근처 천체 이름이 겹치므로 큰 것만
      const d = camera.position.distanceTo(t.position)
      return d < 45 || (FAR_LABELS.has(id) && d < 600) ? t : null
    },
    pick(raycaster: Raycaster) {
      const hit = raycaster.intersectObjects(pickables, false)[0]
      return (hit?.object.userData.id as string | undefined) ?? null
    },
    update(ctx: FrameContext) {
      // 1억 년/초보다 빠르면 깜빡이지 않게 회전을 멈춤
      if (ctx.world.speedIndex < 10)
        heldAngle =
          (((ctx.world.year - 2026) / GALACTIC_YEAR) * Math.PI * 2) %
          (Math.PI * 2)
      disk.rotation.y = heldAngle
      ;(milkyWay.material as ShaderMaterial).uniforms.uPixelRatio.value =
        ctx.pixelRatio
      ;(armGlow.material as ShaderMaterial).uniforms.uPixelRatio.value =
        ctx.pixelRatio
      faceCamera(bulgeGlow, ctx.camera)
      faceCamera(hole, ctx.camera)
      ;(hole.material as ShaderMaterial).uniforms.uTime.value = ctx.elapsed
      for (const group of markers.values()) {
        const glow = group.userData.glow as Mesh
        faceCamera(glow, ctx.camera)
        for (const child of group.children)
          if (child instanceof Points)
            (child.material as ShaderMaterial).uniforms.uPixelRatio.value =
              ctx.pixelRatio
      }
      const t = ctx.selected ? target(ctx.selected) : null
      shell.visible = Boolean(t)
      if (t) {
        shell.position.copy(t.position)
        shell.scale.setScalar(t.radius * 1.8)
        if (!ctx.reducedMotion) shell.rotation.y = ctx.elapsed * 0.08
      }
      ;(sky.stars.material as ShaderMaterial).uniforms.uPixelRatio.value =
        ctx.pixelRatio
    },
    dispose: () => disposeObject(scene),
  }
}
