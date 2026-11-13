import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  LineBasicMaterial,
  LineLoop,
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
import { clamp, seededRandom } from '@/shared/lib'
import { COSMIC_STRUCTURES } from '../../../model/cosmic/catalog'
import type { CosmicStructure } from '../../../model/cosmic/catalog'
import {
  cosmicAgeAtYear,
  growth,
  scaleFactor,
} from '../../../model/cosmic/cosmology'
import { makeCosmicWeb } from '../../../lib/cosmicWeb'
import { NOISE, pointsVertex, starPointsFragment } from '../../../lib/shaders'
import {
  disposeObject,
  faceCamera,
  makeGlow,
  makeSelectionShell,
  raDecToGalacticScene,
} from '../common'
import type { FrameContext, ScaleScene, Target } from '../types'

/** 거리 압축: 장면 반지름 = 8·√(백만 광년) */
const sceneRadius = (mly: number) => 8 * Math.sqrt(Math.max(mly, 0))

const cmbFragment = /* glsl */ `
${NOISE}
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float n = fbm(d * 4.0) * 0.6 + fbm(d * 11.0) * 0.4;
  vec3 cold = vec3(0.08, 0.2, 0.55);
  vec3 hot = vec3(0.75, 0.32, 0.12);
  vec3 c = mix(cold, hot, smoothstep(-0.35, 0.35, n));
  gl_FragColor = vec4(c * 0.16, 1.0);
}
`
const cmbVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

function structureSize(s: CosmicStructure) {
  const half = s.sizeMly / 2
  return Math.max(
    4,
    (sceneRadius(s.distanceMly + half) -
      sceneRadius(Math.max(s.distanceMly - half, 0))) /
      2,
  )
}

export function createCosmicScene(): ScaleScene {
  const scene = new Scene()
  scene.background = new Color('#020308')

  // 우주 거미줄 (상자 1,200백만 광년, 우리를 가운데 둠)
  const web = makeCosmicWeb({
    grid: 36,
    box: 1200,
    modes: 140,
    seed: 11,
    strength: 1.05,
  })
  const positions = new Float32Array(web.count * 3)
  const colors = new Float32Array(web.count * 3)
  const sizes = new Float32Array(web.count).fill(1.3)
  const webGeometry = new BufferGeometry()
  webGeometry.setAttribute('position', new BufferAttribute(positions, 3))
  webGeometry.setAttribute('aColor', new BufferAttribute(colors, 3))
  webGeometry.setAttribute('aSize', new BufferAttribute(sizes, 1))
  const webPoints = new Points(
    webGeometry,
    new ShaderMaterial({
      vertexShader: pointsVertex,
      fragmentShader: starPointsFragment,
      uniforms: {
        uPixelRatio: { value: 1 },
        uSize: { value: 1100 },
        uOpacity: { value: 0.9 },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  )
  webPoints.frustumCulled = false
  scene.add(webPoints)
  let lastGrowth = -1

  function updateWeb(D: number) {
    for (let i = 0; i < web.count; i++) {
      const x = web.q[i * 3] + D * web.psi[i * 3]
      const y = web.q[i * 3 + 1] + D * web.psi[i * 3 + 1]
      const z = web.q[i * 3 + 2] + D * web.psi[i * 3 + 2]
      const r = Math.hypot(x, y, z) || 1
      const s = sceneRadius(r) / r
      positions[i * 3] = x * s
      positions[i * 3 + 1] = y * s
      positions[i * 3 + 2] = z * s
      // 젤도비치 밀도 대비 δ ≈ −D·∇·ψ
      const density = clamp(1 - D * web.divergence[i], 0.02, 8)
      const b = clamp(0.1 + 0.55 * density ** 1.3, 0.06, 2.2)
      colors[i * 3] = 0.62 * b
      colors[i * 3 + 1] = 0.7 * b
      colors[i * 3 + 2] = 1 * b
      sizes[i] = 0.6 + Math.min(density, 5) * 0.5
    }
    webGeometry.attributes.position.needsUpdate = true
    webGeometry.attributes.aColor.needsUpdate = true
    webGeometry.attributes.aSize.needsUpdate = true
  }

  // 실제 구조 표지
  const markers = new Map<string, Group>()
  const pickables: Mesh[] = []
  const random = seededRandom(5)
  for (const s of COSMIC_STRUCTURES) {
    const group = new Group()
    const size =
      s.kind === 'horizon'
        ? sceneRadius(s.distanceMly)
        : s.id === 'kbc-void'
          ? sceneRadius(1000)
          : structureSize(s)
    if (s.ra !== null && s.dec !== null)
      group.position.copy(
        raDecToGalacticScene(s.ra, s.dec, sceneRadius(s.distanceMly)),
      )
    if (s.kind === 'horizon') {
      const cmb = new Mesh(
        new SphereGeometry(size, 64, 32),
        // 불투명 배경으로 가장 먼저 그려 거미줄 입자를 덮지 않게 함
        new ShaderMaterial({
          vertexShader: cmbVertex,
          fragmentShader: cmbFragment,
          side: BackSide,
          depthWrite: false,
        }),
      )
      cmb.renderOrder = -10
      group.add(cmb)
    } else if (s.kind === 'void') {
      const ring = new LineLoop(
        new BufferGeometry().setFromPoints(
          Array.from(
            { length: 96 },
            (_, i) =>
              new Vector3(
                Math.cos((i / 96) * Math.PI * 2),
                Math.sin((i / 96) * Math.PI * 2),
                0,
              ),
          ),
        ),
        new LineBasicMaterial({
          color: '#7c9cff',
          transparent: true,
          opacity: 0.45,
          depthWrite: false,
        }),
      )
      ring.scale.setScalar(size)
      group.add(ring)
      group.userData.billboard = ring
    } else if (s.kind === 'wall' || s.kind === 'lqg' || s.kind === 'ring') {
      // 장성·거대 퀘이사군·고리: 시선에 수직인 호 위의 점들
      const count = s.kind === 'lqg' ? 80 : 420
      const pts = new Float32Array(count * 3)
      for (let i = 0; i < count; i++) {
        const t = (i / count - 0.5) * (s.kind === 'ring' ? Math.PI * 2 : 1.6)
        const r = s.kind === 'ring' ? size : size * 1.4
        const x = s.kind === 'ring' ? Math.cos(t) * r : Math.sin(t) * r
        const y =
          s.kind === 'ring' ? Math.sin(t) * r : (Math.cos(t) - 0.8) * r * 0.5
        pts.set(
          [
            x + (random() - 0.5) * size * 0.12,
            y + (random() - 0.5) * size * 0.12,
            (random() - 0.5) * size * 0.2,
          ],
          i * 3,
        )
      }
      const geometry = new BufferGeometry()
      geometry.setAttribute('position', new BufferAttribute(pts, 3))
      geometry.setAttribute(
        'aColor',
        new BufferAttribute(new Float32Array(count * 3).fill(0.9), 3),
      )
      geometry.setAttribute(
        'aSize',
        new BufferAttribute(
          new Float32Array(count).fill(s.kind === 'lqg' ? 3 : 1.6),
          1,
        ),
      )
      const arc = new Points(
        geometry,
        new ShaderMaterial({
          vertexShader: pointsVertex,
          fragmentShader: starPointsFragment,
          uniforms: {
            uPixelRatio: { value: 1 },
            uSize: { value: 1400 },
            uOpacity: { value: 0.85 },
          },
          transparent: true,
          depthWrite: false,
          blending: AdditiveBlending,
        }),
      )
      arc.frustumCulled = false
      group.add(arc)
      group.userData.billboard = arc
    } else {
      const glow = makeGlow(
        s.kind === 'group' ? '#ffd27a' : '#c9b8ff',
        size * 1.1,
        0.45,
      )
      group.add(glow)
      group.userData.glow = glow
    }
    const pick = new Mesh(
      new SphereGeometry(s.kind === 'horizon' ? 1 : Math.max(size, 6), 8, 6),
      new MeshBasicMaterial({ visible: false }),
    )
    if (s.kind !== 'horizon') {
      pick.userData.id = s.id
      pickables.push(pick)
      group.add(pick)
    }
    scene.add(group)
    markers.set(s.id, group)
  }

  const shell = makeSelectionShell()
  scene.add(shell)

  const target = (id: string): Target | null => {
    const m = markers.get(id)
    const s = COSMIC_STRUCTURES.find((x) => x.id === id)
    if (!m || !s) return null
    const radius =
      s.kind === 'horizon'
        ? sceneRadius(s.distanceMly) * 0.62
        : s.id === 'kbc-void'
          ? sceneRadius(1000) * 0.6
          : Math.max(structureSize(s), 5)
    return { position: m.position.clone(), radius }
  }

  return {
    id: 'cosmic',
    scene,
    near: 0.5,
    far: 120_000,
    overview: () => ({
      target: new Vector3(0, 0, 0),
      distance: 900,
      elevation: 0.45,
    }),
    target,
    labelAnchor: (id: string, camera: PerspectiveCamera) => {
      const t = target(id)
      if (!t) return null
      if (id === 'cmb')
        return { position: new Vector3(0, t.radius * 1.55, 0), radius: 1 }
      return camera.position.distanceTo(t.position) < 6000 ? t : null
    },
    pick(raycaster: Raycaster) {
      const hit = raycaster.intersectObjects(pickables, false)[0]
      return (hit?.object.userData.id as string | undefined) ?? null
    },
    update(ctx: FrameContext) {
      const age = ctx.cosmicAge ?? cosmicAgeAtYear(ctx.world.year)
      const D = growth(scaleFactor(Math.max(age, 0.05)))
      if (Math.abs(D - lastGrowth) > 0.002) {
        lastGrowth = D
        updateWeb(D)
      }
      ;(webPoints.material as ShaderMaterial).uniforms.uPixelRatio.value =
        ctx.pixelRatio
      for (const group of markers.values()) {
        const glow = group.userData.glow as Mesh | undefined
        if (glow) faceCamera(glow, ctx.camera)
        const board = group.userData.billboard as
          { quaternion: Vector3 } | undefined
        if (board) faceCamera(board as never, ctx.camera)
        for (const child of group.children)
          if (child instanceof Points)
            (child.material as ShaderMaterial).uniforms.uPixelRatio.value =
              ctx.pixelRatio
      }
      const t = ctx.selected ? target(ctx.selected) : null
      shell.visible = Boolean(t) && ctx.selected !== 'cmb'
      if (t) {
        shell.position.copy(t.position)
        shell.scale.setScalar(t.radius * 1.4)
        if (!ctx.reducedMotion) shell.rotation.y = ctx.elapsed * 0.05
      }
    },
    dispose: () => disposeObject(scene),
  }
}
