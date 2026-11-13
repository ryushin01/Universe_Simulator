import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  EdgesGeometry,
  Group,
  IcosahedronGeometry,
  ImageBitmapLoader,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Quaternion,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  NoColorSpace,
  Texture,
  Vector3,
} from 'three'
import type { Camera, Object3D } from 'three'
import {
  equatorialToEcliptic,
  equatorialToGalactic,
  eclipticToScene,
  gaussian,
  seededRandom,
  sphericalToCartesian,
} from '@/shared/lib'
import type { Vec3 } from '@/shared/lib'
import {
  glowFragment,
  glowVertex,
  skyFragment,
  skyVertex,
  starPointsFragment,
  starPointsVertex,
} from '../../lib/shaders'

/* ── 텍스처 ───────────────────────────────────────────── */

const cache = new Map<string, Promise<Texture>>()

/** 이미지 해석을 메인 스레드 밖(ImageBitmap)에서 처리하는 텍스처 불러오기 */
export function loadTexture(url: string, srgb = true): Promise<Texture> {
  const key = `${url}|${srgb}`
  let promise = cache.get(key)
  if (!promise) {
    const loader = new ImageBitmapLoader()
    loader.setOptions({ imageOrientation: 'flipY', premultiplyAlpha: 'none' })
    promise = loader.loadAsync(url).then((bitmap) => {
      const texture = new Texture(bitmap as ImageBitmap)
      texture.flipY = false
      texture.colorSpace = srgb ? SRGBColorSpace : NoColorSpace
      texture.anisotropy = 4
      texture.needsUpdate = true
      return texture
    })
    cache.set(key, promise)
  }
  return promise
}

/* ── 좌표 ─────────────────────────────────────────────── */

export const toVector = (v: Vec3) => new Vector3(v[0], v[1], v[2])

/** 천체 고정 축(황도 좌표)으로 메시 방향: 메시의 +X=경도 0°, +Y=북극, −Z=동경 90° */
export function axesQuaternion(
  axes: { x: Vec3; y: Vec3; z: Vec3 },
  out = new Quaternion(),
) {
  const X = toVector(eclipticToScene(axes.x))
  const Y = toVector(eclipticToScene(axes.z))
  const Z = toVector(eclipticToScene(axes.y)).negate()
  return out.setFromRotationMatrix(new Matrix4().makeBasis(X, Y, Z))
}

/** 적경·적위 방향 → 장면 단위 벡터 (황도 좌표 기준 장면) */
export function raDecToScene(ra: number, dec: number): Vector3 {
  return toVector(
    eclipticToScene(equatorialToEcliptic(sphericalToCartesian(ra, dec))),
  ).normalize()
}

/** 은하 좌표 → 장면 (은하면이 수평) */
export const galacticToScene = (g: Vec3): Vec3 => [g[0], g[2], -g[1]]

/** 적경·적위·거리 → 은하 좌표계 장면 위치 */
export function raDecToGalacticScene(
  ra: number,
  dec: number,
  dist: number,
): Vector3 {
  return toVector(
    galacticToScene(equatorialToGalactic(sphericalToCartesian(ra, dec, dist))),
  )
}

/* ── 공통 물체 ────────────────────────────────────────── */

/** 카메라를 향하는 빛 번짐 판 */
export function makeGlow(
  color: string | Color,
  size: number,
  intensity = 1,
  rays = 0,
) {
  const material = new ShaderMaterial({
    vertexShader: glowVertex,
    fragmentShader: glowFragment,
    uniforms: {
      uColor: { value: new Color(color) },
      uIntensity: { value: intensity },
      uRays: { value: rays },
      uTime: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
  const mesh = new Mesh(new PlaneGeometry(1, 1), material)
  mesh.scale.setScalar(size)
  mesh.renderOrder = 5
  return mesh
}

/**
 * 장면이 기억하는 사건(섬광·폭발)의 열쇠. 처음으로 돌리거나 저장을 불러오면 사건 id가
 * 다시 1부터 시작하므로, 일어난 시각까지 묶어 같은 id의 다른 사건과 구분합니다.
 */
export const blastKey = (b: { id: number; year: number; sourceId: string }) =>
  `${b.id}:${b.year}:${b.sourceId}`
export const impactKey = (im: {
  id: number
  createdYear: number
  designation: string
}) => `${im.id}:${im.createdYear}:${im.designation}`

const parentQuaternion = new Quaternion()

/**
 * 판(빛 번짐·블랙홀 그림)이 카메라를 바라보게 함.
 * 부모가 돌고 있으면(은하 원반 등) 그 회전을 빼야 화면에서 비스듬히 눕지 않음
 */
export function faceCamera(object: Object3D, camera: Camera) {
  if (object.parent) {
    object.parent.getWorldQuaternion(parentQuaternion)
    object.quaternion
      .copy(parentQuaternion.invert())
      .multiply(camera.quaternion)
  } else object.quaternion.copy(camera.quaternion)
}

/** Space Advisor의 측지선 와이어프레임: 고른 천체를 감싸는 정이십면체 */
export function makeSelectionShell() {
  const group = new Group()
  const geometry = new IcosahedronGeometry(1, 1)
  const edges = new LineSegments(
    new EdgesGeometry(geometry),
    new LineBasicMaterial({
      color: '#dfe6ff',
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    }),
  )
  const vertices = new Points(
    geometry,
    new PointsMaterial({
      color: '#ffffff',
      size: 3,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    }),
  )
  group.add(edges, vertices)
  group.renderOrder = 4
  return group
}

/** 별 가득한 하늘과 은하수 띠 (황도 좌표 기준) */
export function makeSky(options: {
  radius: number
  stars: number
  milkyWay: number
  seed: number
  frame: 'ecliptic' | 'galactic'
}) {
  const group = new Group()
  const pole =
    options.frame === 'ecliptic'
      ? toVector(
          eclipticToScene(
            equatorialToEcliptic(sphericalToCartesian(192.85948, 27.12825)),
          ),
        ).normalize()
      : new Vector3(0, 1, 0)
  const sky = new Mesh(
    new SphereGeometry(options.radius, 48, 24),
    new ShaderMaterial({
      vertexShader: skyVertex,
      fragmentShader: skyFragment,
      uniforms: {
        uGalacticPole: { value: pole },
        uMilkyWay: { value: options.milkyWay },
        uTint: { value: new Color(0, 0, 0) },
      },
      side: BackSide,
      depthWrite: false,
    }),
  )
  sky.renderOrder = -10
  group.add(sky)

  const random = seededRandom(options.seed)
  const count = options.stars
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const palette = [
    new Color('#9bb0ff'),
    new Color('#cad7ff'),
    new Color('#f8f7ff'),
    new Color('#fff4ea'),
    new Color('#ffd2a1'),
    new Color('#ffb070'),
  ]
  const r = options.radius * 0.92
  for (let i = 0; i < count; i++) {
    let dir: Vector3
    if (options.milkyWay > 0 && random() < 0.45) {
      // 은하면 가까이 몰린 별
      const lon = random() * Math.PI * 2
      const lat = gaussian(random) * 0.12
      const g: Vec3 = [
        Math.cos(lat) * Math.cos(lon),
        Math.cos(lat) * Math.sin(lon),
        Math.sin(lat),
      ]
      dir =
        options.frame === 'ecliptic'
          ? galacticToEclipticScene(g)
          : toVector(galacticToScene(g))
    } else {
      const z = random() * 2 - 1
      const t = random() * Math.PI * 2
      const s = Math.sqrt(1 - z * z)
      dir = new Vector3(s * Math.cos(t), z, s * Math.sin(t))
    }
    dir.normalize().multiplyScalar(r)
    positions.set([dir.x, dir.y, dir.z], i * 3)
    const c = palette[Math.floor(random() ** 1.6 * palette.length)]
    const bright = 0.35 + random() ** 3 * 0.9
    colors.set([c.r * bright, c.g * bright, c.b * bright], i * 3)
    sizes[i] = 1.2 + random() ** 6 * 4.5
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('aColor', new BufferAttribute(colors, 3))
  geometry.setAttribute('aSize', new BufferAttribute(sizes, 1))
  const stars = new Points(
    geometry,
    new ShaderMaterial({
      vertexShader: starPointsVertex,
      fragmentShader: starPointsFragment,
      uniforms: {
        uPixelRatio: { value: 1 },
        uScale: { value: 1 },
        uOpacity: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  )
  stars.renderOrder = -9
  group.add(stars)
  return { group, sky, stars }
}

/** 은하 좌표 단위 벡터 → 황도 좌표 장면 */
const GAL_TO_EQ = (() => {
  // 은하 → 적도는 회전 행렬의 전치
  const e = [
    equatorialToGalactic([1, 0, 0]),
    equatorialToGalactic([0, 1, 0]),
    equatorialToGalactic([0, 0, 1]),
  ]
  return (g: Vec3): Vec3 => [
    e[0][0] * g[0] + e[0][1] * g[1] + e[0][2] * g[2],
    e[1][0] * g[0] + e[1][1] * g[1] + e[1][2] * g[2],
    e[2][0] * g[0] + e[2][1] * g[1] + e[2][2] * g[2],
  ]
})()

export function galacticToEclipticScene(g: Vec3): Vector3 {
  return toVector(eclipticToScene(equatorialToEcliptic(GAL_TO_EQ(g))))
}

/** 원형 점 텍스처 없이 부드러운 원으로 그리는 점 재질 */
export function disposeObject(object: {
  traverse: (cb: (o: unknown) => void) => void
}) {
  object.traverse((o) => {
    const mesh = o as {
      geometry?: { dispose: () => void }
      material?: { dispose: () => void } | Array<{ dispose: () => void }>
    }
    mesh.geometry?.dispose()
    const material = mesh.material
    if (Array.isArray(material)) material.forEach((m) => m.dispose())
    else material?.dispose()
  })
}
