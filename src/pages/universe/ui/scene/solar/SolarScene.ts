import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  EdgesGeometry,
  Group,
  IcosahedronGeometry,
  Line,
  LineBasicMaterial,
  LineLoop,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Points,
  Quaternion,
  Raycaster,
  RingGeometry,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  Vector4,
} from 'three'
import type { PerspectiveCamera } from 'three'
import {
  DEG,
  clamp,
  eclipticToScene,
  length,
  normalize,
  seededRandom,
  yearToJd,
} from '@/shared/lib'
import type { Vec3 } from '@/shared/lib'
import { asset } from '@/shared/config'
import { BODIES, BODY_IDS } from '../../../model/solar/bodies'
import type { BodyId } from '../../../model/solar/bodies'
import { bodyAxes, satelliteOffsetKm } from '../../../model/solar/ephemeris'
import {
  elementsFromState,
  orbitPoints,
  MU_SUN,
} from '../../../model/solar/kepler'
import {
  bodyVisualRadius,
  satelliteVisualDistance,
  sceneDistance,
  sunVisualRadius,
  toScene,
} from '../../../model/solar/scale'
import type { DistanceMode } from '../../../model/solar/scale'
import { blackbodyColor, orbitClockYear } from '../../../model/solar/sun'
import { IMPACTOR_KINDS } from '../../../model/hazards/impact'
import { STORM_CLASSES } from '../../../model/hazards/storm'
import {
  INTRUDERS,
  KMS_TO_AU_PER_YEAR,
  flybyGeometry,
  intruderPosition,
} from '../../../model/hazards/flyby'
import { METEOR_SHOWERS } from '../../../model/hazards/meteors'
import { indexOf, relativeState } from '../../../model/hazards/nbody'
import {
  activeAuroras,
  bodyElements,
  bodyInsolation,
  bodyPositionAu,
  bodyTemperatureC,
  colonyPopulation,
  currentShower,
  dysonCapture,
  earthPopulation,
  baselinePopulation,
  hasProject,
  habitableZoneNow,
  intruderPositionAu,
  activeFlyby,
  isRemoved,
  marsAtmosphere,
  stormFrontAu,
  sunState,
  yearsSinceComplete,
} from '../../../model/world/selectors'
import type { WorldState } from '../../../model/world/types'
import {
  MAX_MARKS,
  atmosphereFragment,
  atmosphereVertex,
  beltFragment,
  beltVertex,
  blackHoleFragment,
  cloudFragment,
  glowVertex,
  planetFragment,
  planetVertex,
  shellFragment,
  shellVertex,
  sunFragment,
  sunVertex,
} from '../../../lib/shaders'
import {
  axesQuaternion,
  disposeObject,
  blastKey,
  faceCamera,
  impactKey,
  loadTexture,
  makeGlow,
  makeSelectionShell,
  makeSky,
  raDecToScene,
  toVector,
} from '../common'
import type { FrameContext, ScaleScene, SceneEnv, Target } from '../types'

/** 지구 텍스처: 화면이 좁거나 메모리가 적은 기기는 1024px 벌 */
const earthTextures = (env: SceneEnv) =>
  env.smallTextures
    ? { earth: 'earth-albedo-1024', lights: 'earth-lights-1024' }
    : { earth: 'earth-albedo', lights: 'earth-lights' }

/** 텍스처가 없는 천체의 잡음 표면 [색 A, 색 B, 크기, 능선, 점(경도·위도·반경), 점 색] */
const PROCEDURAL: Partial<
  Record<
    BodyId,
    [string, string, number, number, [number, number, number] | null, string]
  >
> = {
  ceres: ['#5f5b56', '#9a958e', 5, 0, [239, 20, 0.08], '#f2f2ee'],
  io: ['#d9b23a', '#f3e8a0', 4.5, 0, [0, 0, 0], '#3a2410'],
  europa: ['#cdbfa6', '#f4efe6', 3, 1, null, '#a05a3a'],
  ganymede: ['#5d5348', '#b8ad9c', 3.5, 0, null, '#ffffff'],
  callisto: ['#3f3a33', '#7a7166', 7, 0, null, '#ffffff'],
  titan: ['#c98a35', '#e6b65a', 1.6, 0, null, '#ffffff'],
  pluto: ['#8a6a50', '#e2cdb0', 3, 0, [175, 20, 0.45], '#f6efe4'],
  halley: ['#2b2723', '#55504a', 6, 0, null, '#ffffff'],
  apophis: ['#6b625a', '#a39a90', 6, 0, null, '#ffffff'],
}

/** 위도·경도 → 천체 메시의 지역 좌표 방향 */
function localDir(lonDeg: number, latDeg: number): Vector3 {
  const lon = lonDeg * DEG
  const lat = latDeg * DEG
  return new Vector3(
    Math.cos(lat) * Math.cos(lon),
    Math.sin(lat),
    -Math.cos(lat) * Math.sin(lon),
  )
}

const COLONY_SITES: Partial<
  Record<
    BodyId,
    { kind: 'moon-base' | 'mars-city' | 'titan-base'; dir: Vector3 }
  >
> = {
  moon: { kind: 'moon-base', dir: localDir(0, -85) },
  mars: { kind: 'mars-city', dir: localDir(70, -42) },
  titan: { kind: 'titan-base', dir: localDir(310, 68) },
}

interface BodyVisual {
  id: BodyId
  group: Group
  spin: Group
  material: ShaderMaterial
  pick: Mesh
  radius: number
  glow?: Mesh
  clouds?: Mesh
  orbit?: LineLoop
  orbitKey?: string
  /** 마지막으로 계산한 궤도가 닫힌 궤도인지 (N체 중 이심률 1 이상이면 숨김) */
  orbitValid?: boolean
}

function makePlanetMaterial(id: BodyId) {
  const body = BODIES[id]
  const proc = PROCEDURAL[id]
  const spot = proc?.[4]
  const spotDir = spot ? localDir(spot[0], spot[1]) : new Vector3(1, 0, 0)
  return new ShaderMaterial({
    vertexShader: planetVertex,
    fragmentShader: planetFragment,
    uniforms: {
      uMap: { value: null },
      uHasMap: { value: 0 },
      uNight: { value: null },
      uHasNight: { value: 0 },
      uColorA: { value: new Color(proc?.[0] ?? body.color) },
      uColorB: { value: new Color(proc?.[1] ?? body.color) },
      uNoiseScale: { value: proc?.[2] ?? 3 },
      uRidged: { value: proc?.[3] ?? 0 },
      uSpot: {
        value: new Vector4(spotDir.x, spotDir.y, spotDir.z, spot?.[2] ?? 0),
      },
      uSpotColor: { value: new Color(proc?.[5] ?? '#ffffff') },
      uSunPos: { value: new Vector3() },
      uSunColor: { value: new Color(1, 1, 1) },
      uLight: { value: 1 },
      uAurora: { value: 0 },
      uHeat: { value: 0 },
      uIce: { value: 0 },
      uDry: { value: 0 },
      uTerraform: { value: 0 },
      uCityLights: { value: 1 },
      uTime: { value: 0 },
      uMarks: { value: Array.from({ length: MAX_MARKS }, () => new Vector4()) },
      uMarkInfo: {
        value: Array.from({ length: MAX_MARKS }, () => new Vector4()),
      },
    },
  })
}

function makeAtmosphere(color: string, strength: number) {
  return new Mesh(
    new SphereGeometry(1.06, 48, 24),
    new ShaderMaterial({
      vertexShader: atmosphereVertex,
      fragmentShader: atmosphereFragment,
      uniforms: {
        uColor: { value: new Color(color) },
        uStrength: { value: strength },
        uSunPos: { value: new Vector3() },
        uCenter: { value: new Vector3() },
      },
      side: BackSide,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  )
}

/** 소행성대·카이퍼 벨트 점 */
function makeBelt(
  count: number,
  seed: number,
  aRange: [number, number],
  eMax: number,
  iMax: number,
  color: string,
) {
  const random = seededRandom(seed)
  const orbit = new Float32Array(count * 4)
  const phase = new Float32Array(count * 2)
  const kirkwood = [2.5, 2.82, 2.95, 3.27]
  for (let k = 0; k < count; k++) {
    let a = aRange[0] + random() * (aRange[1] - aRange[0])
    // 커크우드 틈 (목성과 궤도 공명하는 곳)은 비움
    while (kirkwood.some((g) => Math.abs(a - g) < 0.03 && aRange[1] < 5))
      a = aRange[0] + random() * (aRange[1] - aRange[0])
    orbit.set(
      [a, random() * eMax, random() ** 2 * iMax * DEG, random() * Math.PI * 2],
      k * 4,
    )
    phase.set([random() * Math.PI * 2, random() * Math.PI * 2], k * 2)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array(count * 3), 3),
  )
  geometry.setAttribute('aOrbit', new BufferAttribute(orbit, 4))
  geometry.setAttribute('aPhase', new BufferAttribute(phase, 2))
  const material = new ShaderMaterial({
    vertexShader: beltVertex,
    fragmentShader: beltFragment,
    uniforms: {
      uDays: { value: 0 },
      uLinear: { value: 0 },
      uExpand: { value: 1 },
      uPixelRatio: { value: 1 },
      uSize: { value: 1 },
      uColor: { value: new Color(color) },
      uOpacity: { value: 0.55 },
    },
    transparent: true,
    depthWrite: false,
  })
  const points = new Points(geometry, material)
  points.frustumCulled = false
  return points
}

function makeShell(color: string, opacity: number) {
  return new ShaderMaterial({
    vertexShader: shellVertex,
    fragmentShader: shellFragment,
    uniforms: {
      uColor: { value: new Color(color) },
      uOpacity: { value: opacity },
      uTime: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
  })
}

const lineMaterial = (color: string, opacity: number) =>
  new LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
  })

function setLine(line: Line | LineLoop | LineSegments, points: Vector3[]) {
  const positions = new Float32Array(points.length * 3)
  points.forEach((p, i) => positions.set([p.x, p.y, p.z], i * 3))
  line.geometry.dispose()
  line.geometry = new BufferGeometry()
  line.geometry.setAttribute('position', new BufferAttribute(positions, 3))
}

export function createSolarScene(env: SceneEnv): ScaleScene {
  const TEXTURES = earthTextures(env)
  const scene = new Scene()
  const sky = makeSky({
    radius: 9000,
    stars: 5200,
    milkyWay: 1,
    seed: 7,
    frame: 'ecliptic',
  })
  scene.add(sky.group)

  /* 태양 */
  const sunGroup = new Group()
  const sunMaterial = new ShaderMaterial({
    vertexShader: sunVertex,
    fragmentShader: sunFragment,
    uniforms: {
      uColor: { value: new Color('#ffd27a') },
      uTime: { value: 0 },
      uGiant: { value: 0 },
    },
  })
  const sunMesh = new Mesh(new SphereGeometry(1, 64, 32), sunMaterial)
  const corona = makeGlow('#ffcf7a', 1, 1, 0.6)
  const sunHole = new Mesh(
    new PlaneGeometry(1, 1),
    new ShaderMaterial({
      vertexShader: glowVertex,
      fragmentShader: blackHoleFragment,
      uniforms: { uTime: { value: 0 }, uDisk: { value: 0.35 } },
      transparent: true,
      depthWrite: false,
    }),
  )
  sunHole.visible = false
  sunHole.renderOrder = 6
  const sunPick = new Mesh(
    new SphereGeometry(1, 12, 8),
    new MeshBasicMaterial({ visible: false }),
  )
  sunPick.userData.id = 'sun'
  sunGroup.add(sunMesh, corona, sunHole, sunPick)
  scene.add(sunGroup)
  const nebula = new Mesh(
    new SphereGeometry(1, 64, 32),
    makeShell('#57d0c8', 0.35),
  )
  nebula.visible = false
  scene.add(nebula)

  /* 행성·위성 */
  const visuals = new Map<BodyId, BodyVisual>()
  const pickables: Mesh[] = [sunPick]
  for (const id of BODY_IDS) {
    if (id === 'sun') continue
    const body = BODIES[id]
    const radius = bodyVisualRadius(id)
    const group = new Group()
    const spin = new Group()
    const material = makePlanetMaterial(id)
    const mesh = new Mesh(
      new SphereGeometry(
        1,
        body.kind === 'planet' ? 48 : 28,
        body.kind === 'planet' ? 24 : 14,
      ),
      material,
    )
    spin.add(mesh)
    spin.scale.setScalar(radius)
    group.add(spin)
    const pick = new Mesh(
      new SphereGeometry(Math.max(radius * 1.4, 0.32), 12, 8),
      new MeshBasicMaterial({ visible: false }),
    )
    pick.userData.id = id
    group.add(pick)
    pickables.push(pick)
    const visual: BodyVisual = { id, group, spin, material, pick, radius }
    if (body.glow) {
      visual.glow = makeAtmosphere(body.glow.color, body.glow.strength)
      visual.glow.scale.setScalar(radius)
      group.add(visual.glow)
    }
    if (body.texture) {
      const name = id === 'earth' ? TEXTURES.earth : body.texture
      loadTexture(asset(`textures/${name}.webp`))
        .then((texture) => {
          material.uniforms.uMap.value = texture
          material.uniforms.uHasMap.value = 1
        })
        .catch(() => {})
    }
    if (id === 'earth') {
      loadTexture(asset(`textures/${TEXTURES.lights}.webp`))
        .then((texture) => {
          material.uniforms.uNight.value = texture
          material.uniforms.uHasNight.value = 1
        })
        .catch(() => {})
      const cloudMaterial = new ShaderMaterial({
        vertexShader: planetVertex,
        fragmentShader: cloudFragment,
        uniforms: {
          uMap: { value: null },
          uSunPos: { value: new Vector3() },
          uOpacity: { value: 0 },
          uOffset: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
      })
      visual.clouds = new Mesh(new SphereGeometry(1.012, 64, 32), cloudMaterial)
      spin.add(visual.clouds)
      loadTexture(asset('textures/earth-clouds.webp'), false)
        .then((texture) => {
          cloudMaterial.uniforms.uMap.value = texture
          cloudMaterial.uniforms.uOpacity.value = 0.85
        })
        .catch(() => {})
    }
    if (body.rings) {
      const ringGeometry = new RingGeometry(
        body.rings.inner,
        body.rings.outer,
        128,
        1,
      )
      // 원판 반지름 방향으로 텍스처 u가 흐르도록
      const pos = ringGeometry.attributes.position
      const uv = ringGeometry.attributes.uv
      for (let i = 0; i < pos.count; i++) {
        const r = Math.hypot(pos.getX(i), pos.getY(i))
        uv.setXY(
          i,
          (r - body.rings.inner) / (body.rings.outer - body.rings.inner),
          0.5,
        )
      }
      ringGeometry.rotateX(-Math.PI / 2)
      const ringMaterial = new MeshBasicMaterial({
        color: '#d9c9a3',
        transparent: true,
        opacity: 0.85,
        side: DoubleSide,
        depthWrite: false,
      })
      loadTexture(asset('textures/saturn-ring.webp'))
        .then((texture) => {
          ringMaterial.map = texture
          ringMaterial.color.set('#ffffff')
          ringMaterial.needsUpdate = true
        })
        .catch(() => {})
      spin.add(new Mesh(ringGeometry, ringMaterial))
    }
    if (!body.parent) {
      visual.orbit = new LineLoop(
        new BufferGeometry(),
        lineMaterial('#7c9cff', 0.28),
      )
      scene.add(visual.orbit)
    } else {
      visual.orbit = new LineLoop(
        new BufferGeometry(),
        lineMaterial('#7c9cff', 0.22),
      )
    }
    visuals.set(id, visual)
    scene.add(group)
  }
  // 위성 궤도는 모행성 그룹 안에
  for (const visual of visuals.values()) {
    const parent = BODIES[visual.id].parent
    if (parent && visual.orbit) visuals.get(parent)?.group.add(visual.orbit)
  }

  /* 띠 */
  const asteroidBelt = makeBelt(2600, 11, [2.15, 3.3], 0.2, 16, '#b8a690')
  const kuiperBelt = makeBelt(2200, 23, [39, 48], 0.1, 10, '#8fa6c8')
  scene.add(asteroidBelt, kuiperBelt)

  /* 거주 가능 영역 */
  const hz = new Mesh(
    new RingGeometry(1, 2, 160, 1).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({
      color: '#5fe0a8',
      transparent: true,
      opacity: 0.1,
      side: DoubleSide,
      depthWrite: false,
    }),
  )
  let hzKey = ''
  scene.add(hz)

  /* 선택 표시 */
  const shell = makeSelectionShell()
  scene.add(shell)

  /* 재해 표현 */
  const impactors = Array.from({ length: 6 }, () => {
    const group = new Group()
    const rock = new Mesh(
      new IcosahedronGeometry(1, 1),
      new MeshBasicMaterial({ color: '#b8aa98' }),
    )
    rock.scale.setScalar(0.06)
    const tail = makeGlow('#bfe3ff', 0.6, 0.7)
    const path = new Line(new BufferGeometry(), lineMaterial('#ffa25c', 0.5))
    group.add(rock, tail)
    group.visible = false
    path.visible = false
    scene.add(group, path)
    return { group, rock, tail, path }
  })
  const flashes: Array<{
    mesh: Mesh
    start: number
    body: BodyId
    dir: Vector3
    size: number
  }> = []
  const seenHits = new Set<string>()
  // 폭풍 등급마다 퍼지는 원뿔 각이 달라 구의 일부(캡)를 각도별로 한 번만 만듦
  const stormCaps = new Map<number, SphereGeometry>()
  const stormCap = (halfAngle: number) => {
    let cap = stormCaps.get(halfAngle)
    if (!cap) {
      cap = new SphereGeometry(1, 48, 12, 0, Math.PI * 2, 0, halfAngle * DEG)
      stormCaps.set(halfAngle, cap)
    }
    return cap
  }
  const storms = Array.from({ length: 4 }, () => {
    const mesh = new Mesh(stormCap(45), makeShell('#fff0dc', 1))
    mesh.visible = false
    scene.add(mesh)
    return mesh
  })
  const blastSprites = Array.from({ length: 4 }, () => {
    const glow = makeGlow('#dfe8ff', 1, 1, 1)
    glow.visible = false
    const remnant = new Mesh(
      new SphereGeometry(1, 32, 16),
      makeShell('#ff7ab8', 0.4),
    )
    remnant.visible = false
    scene.add(glow, remnant)
    return { glow, remnant }
  })
  const blastSeen = new Map<string, number>()

  const intruder = new Group()
  const intruderStar = new Mesh(
    new SphereGeometry(1, 32, 16),
    new MeshBasicMaterial({ color: '#ffffff' }),
  )
  const intruderGlow = makeGlow('#ffffff', 1, 1, 0.4)
  const intruderHole = new Mesh(
    new PlaneGeometry(1, 1),
    new ShaderMaterial({
      vertexShader: glowVertex,
      fragmentShader: blackHoleFragment,
      uniforms: { uTime: { value: 0 }, uDisk: { value: 0.6 } },
      transparent: true,
      depthWrite: false,
    }),
  )
  intruder.add(intruderStar, intruderGlow, intruderHole)
  intruder.visible = false
  const intruderPath = new Line(
    new BufferGeometry(),
    lineMaterial('#ff9a9a', 0.45),
  )
  intruderPath.visible = false
  const intruderPick = new Mesh(
    new SphereGeometry(1, 12, 8),
    new MeshBasicMaterial({ visible: false }),
  )
  intruderPick.userData.id = 'intruder'
  intruder.add(intruderPick)
  scene.add(intruder, intruderPath)

  /* 유성 */
  const METEORS = 48
  const meteorGeometry = new BufferGeometry()
  meteorGeometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array(METEORS * 6), 3),
  )
  meteorGeometry.setAttribute(
    'color',
    new BufferAttribute(new Float32Array(METEORS * 6), 3),
  )
  const meteorLines = new LineSegments(
    meteorGeometry,
    new LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  )
  meteorLines.frustumCulled = false
  scene.add(meteorLines)
  const meteors = Array.from({ length: METEORS }, () => ({
    alive: 0,
    life: 0,
    start: new Vector3(),
    dir: new Vector3(),
  }))
  let meteorBudget = 0
  const meteorRandom = seededRandom(99)
  const streams = new Map<string, Points>()
  function streamFor(id: string) {
    let points = streams.get(id)
    if (points) return points
    const shower = METEOR_SHOWERS.find((s) => s.id === id)
    if (!shower) return null
    const random = seededRandom(id.length * 977)
    const count = 900
    const raw: Vec3[] = []
    const el = shower.parentOrbit
    const pts = orbitPoints(el, count)
    for (let k = 0; k < count; k++) {
      const p = pts[k]
      const spread = 0.012 * length(p)
      raw.push([
        p[0] + (random() - 0.5) * spread,
        p[1] + (random() - 0.5) * spread,
        p[2] + (random() - 0.5) * spread,
      ])
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute(
      'position',
      new BufferAttribute(new Float32Array(count * 3), 3),
    )
    points = new Points(
      geometry,
      new ShaderMaterial({
        vertexShader: `uniform float uPixelRatio; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = 2.0 * uPixelRatio; gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `uniform vec3 uColor; uniform float uOpacity; void main(){ vec2 p = gl_PointCoord*2.0-1.0; if(dot(p,p)>1.0) discard; gl_FragColor = vec4(uColor, uOpacity); }`,
        uniforms: {
          uPixelRatio: { value: 1 },
          uColor: { value: new Color('#9fd6ff') },
          uOpacity: { value: 0.45 },
        },
        transparent: true,
        depthWrite: false,
      }),
    )
    points.userData.raw = raw
    points.userData.mode = ''
    points.frustumCulled = false
    streams.set(id, points)
    scene.add(points)
    return points
  }

  /* 거대 구조물 */
  const structures = new Group()
  scene.add(structures)
  const SWARM = 5000
  const swarmRandom = seededRandom(5)
  const swarmData = Array.from({ length: SWARM }, () => ({
    r: 0.45 + swarmRandom() * 0.1,
    plane: Math.floor(swarmRandom() * 7),
    phase: swarmRandom() * Math.PI * 2,
  }))
  const swarmGeometry = new BufferGeometry()
  swarmGeometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array(SWARM * 3), 3),
  )
  const swarm = new Points(
    swarmGeometry,
    new ShaderMaterial({
      vertexShader: `uniform float uPixelRatio; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = 2.2 * uPixelRatio; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `void main(){ vec2 p = gl_PointCoord*2.0-1.0; if(dot(p,p)>1.0) discard; gl_FragColor = vec4(1.0,0.82,0.45,0.85); }`,
      uniforms: { uPixelRatio: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  )
  swarm.frustumCulled = false
  const sphereShell = new Group()
  const sphereGeo = new IcosahedronGeometry(1, 3)
  const sphereLines = new LineSegments(
    new EdgesGeometry(sphereGeo),
    lineMaterial('#ffd27a', 0.25),
  )
  const spherePanels = new Mesh(
    sphereGeo,
    new MeshBasicMaterial({
      color: '#c79a4a',
      transparent: true,
      opacity: 0.08,
      side: DoubleSide,
      depthWrite: false,
    }),
  )
  sphereShell.add(sphereLines, spherePanels)
  const ringworld = new Group()
  const ringBand = new Mesh(
    new CylinderGeometry(1, 1, 0.02, 256, 1, true),
    new MeshBasicMaterial({
      color: '#7fa7d8',
      transparent: true,
      opacity: 0.75,
      side: DoubleSide,
    }),
  )
  const shadowSquares = new Mesh(
    new CylinderGeometry(0.42, 0.42, 0.012, 20, 1, true),
    new MeshBasicMaterial({
      color: '#0b1226',
      transparent: true,
      opacity: 0.7,
      side: DoubleSide,
    }),
  )
  ringworld.add(ringBand, shadowSquares)
  const engineMirror = new Mesh(
    new SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, 0.9),
    new MeshBasicMaterial({
      color: '#c8d4ff',
      transparent: true,
      opacity: 0.35,
      side: DoubleSide,
      depthWrite: false,
    }),
  )
  engineMirror.rotation.z = Math.PI / 2
  const sunshade = new Mesh(
    new CircleGeometry(0.13, 32),
    new MeshBasicMaterial({
      color: '#2a3558',
      transparent: true,
      opacity: 0.85,
      side: DoubleSide,
    }),
  )
  const sentinel = new Mesh(
    new SphereGeometry(0.035, 12, 8),
    new MeshBasicMaterial({ color: '#4fc3ff' }),
  )
  const defenseNet = new Group()
  defenseNet.add(
    new LineLoop(
      new BufferGeometry().setFromPoints(
        Array.from(
          { length: 64 },
          (_, i) =>
            new Vector3(
              Math.cos((i / 64) * Math.PI * 2),
              0,
              Math.sin((i / 64) * Math.PI * 2),
            ),
        ),
      ),
      lineMaterial('#7c9cff', 0.6),
    ),
  )
  for (let i = 0; i < 12; i++) {
    const dot = new Mesh(
      new SphereGeometry(0.03, 8, 6),
      new MeshBasicMaterial({ color: '#dfe6ff' }),
    )
    const t = (i / 12) * Math.PI * 2
    dot.position.set(Math.cos(t), 0, Math.sin(t))
    defenseNet.add(dot)
  }
  defenseNet.rotation.x = 0.5
  const marsShield = new Mesh(
    new TorusGeometry(0.42, 0.025, 8, 48),
    new MeshBasicMaterial({
      color: '#7ecbff',
      transparent: true,
      opacity: 0.85,
    }),
  )
  const marsShieldGlow = makeGlow('#4fc3ff', 1.4, 0.6)
  const oneill = new Group()
  for (const offset of [-0.07, 0.07]) {
    const cylinder = new Mesh(
      new CylinderGeometry(0.03, 0.03, 0.22, 16),
      new MeshBasicMaterial({ color: '#d7deef' }),
    )
    cylinder.position.x = offset
    oneill.add(cylinder)
  }
  const elevator = new Line(
    new BufferGeometry().setFromPoints([
      new Vector3(1, 0, 0),
      new Vector3(2.6, 0, 0),
    ]),
    lineMaterial('#dfe6ff', 0.8),
  )
  const tug = new Mesh(
    new IcosahedronGeometry(0.07, 1),
    new MeshBasicMaterial({ color: '#a79a88' }),
  )
  structures.add(
    swarm,
    sphereShell,
    ringworld,
    engineMirror,
    sunshade,
    sentinel,
    defenseNet,
    marsShield,
    marsShieldGlow,
    oneill,
    tug,
  )

  /* 프레임마다 쓰는 값 */
  const positions = new Map<BodyId, Vector3>()
  let mode: DistanceMode = 'compressed'
  let sunRadius = 2
  let lastOrbitUpdate = -1
  let lastMoonOrbitYear = -1e12
  // 세계가 바뀌었는지 (처음으로·불러오기면 사건 id가 다시 1부터 시작)
  let lastNextId = 0
  let lastWorldYear = -Infinity
  const tmp = new Vector3()
  const quat = new Quaternion()

  function scenePosition(world: WorldState, id: BodyId): Vector3 | null {
    const body = BODIES[id]
    if (body.parent) {
      const parent =
        positions.get(body.parent) ?? scenePosition(world, body.parent)
      if (!parent || isRemoved(world, id)) return null
      const off = satelliteOffsetKm(id, yearToJd(world.orbitYear))
      const dir = toVector(eclipticToScene(normalize(off)))
      return dir
        .multiplyScalar(satelliteVisualDistance(length(off), body.parent))
        .add(parent)
    }
    const p = bodyPositionAu(world, id)
    return p ? toVector(toScene(p, mode)) : null
  }

  function updateOrbits(
    world: WorldState,
    selected: string | null,
    show: boolean,
    elapsed: number,
  ) {
    const nbodyLive = Boolean(world.nbody)
    const refresh = !nbodyLive || elapsed - lastOrbitUpdate > 0.25
    if (refresh) lastOrbitUpdate = elapsed
    const muSun = MU_SUN * sunState(world).mass
    for (const visual of visuals.values()) {
      const orbit = visual.orbit
      if (!orbit) continue
      const removed = isRemoved(world, visual.id)
      // 궤도를 다시 계산하지 않는 프레임에도 직전 판정(열린 궤도면 숨김)을 유지
      orbit.visible = show && !removed && visual.orbitValid !== false
      const material = orbit.material as LineBasicMaterial
      material.opacity =
        visual.id === selected ? 0.8 : BODIES[visual.id].parent ? 0.18 : 0.28
      material.color.set(visual.id === selected ? '#a9bdff' : '#7c9cff')
      // 열린 궤도로 숨긴 것도 다시 계산할 수 있게 보기 설정과 사라짐만 보고 건너뜀
      if (!show || removed) continue
      if (BODIES[visual.id].parent) {
        if (
          Math.abs(world.orbitYear - lastMoonOrbitYear) < 0.02 &&
          visual.orbitKey
        )
          continue
        const parent = BODIES[visual.id].parent!
        const orbitSpec = BODIES[visual.id].orbit
        const period =
          orbitSpec.type === 'satellite' ? orbitSpec.periodDays : 27.32
        const jd = yearToJd(world.orbitYear)
        const pts: Vector3[] = []
        for (let k = 0; k < 96; k++) {
          const off = satelliteOffsetKm(visual.id, jd + (k / 96) * period)
          pts.push(
            toVector(eclipticToScene(normalize(off))).multiplyScalar(
              satelliteVisualDistance(length(off), parent),
            ),
          )
        }
        setLine(orbit, pts)
        visual.orbitKey = 'moon'
        continue
      }
      if (!refresh) continue
      let el = bodyElements(world, visual.id)
      if (nbodyLive && world.nbody) {
        const i = indexOf(world.nbody, visual.id)
        if (i >= 0) {
          const rel = relativeState(world.nbody, i, 0)
          const live = elementsFromState(rel.r, rel.v, muSun)
          el = live.e < 1 ? live : null
        }
      }
      visual.orbitValid = Boolean(el)
      if (!el) {
        orbit.visible = false
        continue
      }
      orbit.visible = show
      const key = `${mode}|${el.a.toPrecision(5)}|${el.e.toFixed(4)}|${el.i.toFixed(2)}|${el.node.toFixed(1)}|${el.argPeri.toFixed(1)}`
      if (key === visual.orbitKey) continue
      visual.orbitKey = key
      const segments = el.e > 0.5 ? 512 : 256
      setLine(
        orbit,
        orbitPoints(el, segments).map((p) => toVector(toScene(p, mode))),
      )
    }
    if (Math.abs(world.orbitYear - lastMoonOrbitYear) >= 0.02)
      lastMoonOrbitYear = world.orbitYear
  }

  function updateBody(
    visual: BodyVisual,
    world: WorldState,
    ctx: FrameContext,
    sunColor: Color,
  ) {
    const id = visual.id
    const pos = positions.get(id)
    visual.group.visible = Boolean(pos)
    if (!pos) return
    visual.group.position.copy(pos)
    const jd = yearToJd(world.orbitYear)
    const parent = BODIES[id].parent
    const toward =
      parent && positions.get(parent)
        ? (() => {
            const p = positions.get(parent)!.clone().sub(pos)
            return [p.x, -p.z, p.y] as Vec3
          })()
        : undefined
    visual.spin.quaternion.copy(axesQuaternion(bodyAxes(id, jd, toward), quat))
    const u = visual.material.uniforms
    u.uSunPos.value.set(0, 0, 0)
    u.uSunColor.value.copy(sunColor)
    const s = bodyInsolation(world, id)
    u.uLight.value = s <= 0 ? 0 : clamp(0.2 + 0.9 * s ** 0.12, 0, 1.6)
    u.uTime.value = ctx.elapsed
    const temp = bodyTemperatureC(world, id) ?? 0
    u.uHeat.value = clamp((temp - 250) / 900, 0, 1)
    const aurora = activeAuroras(world).find((a) => a.body === id)
    u.uAurora.value = aurora ? aurora.strength : 0
    if (id === 'earth') {
      u.uDry.value = 1 - world.earth.ocean
      u.uIce.value = clamp((-10 - temp) / 40, 0, 1)
      const base = baselinePopulation(world.year)
      u.uCityLights.value = clamp(earthPopulation(world) / base, 0, 1)
      if (visual.clouds) {
        const cu = (visual.clouds.material as ShaderMaterial).uniforms
        cu.uOffset.value = (ctx.elapsed * 0.004) % 1
        cu.uOpacity.value = cu.uMap.value
          ? clamp(0.85 * world.earth.ocean, 0, 0.85) * (temp > 200 ? 0 : 1)
          : 0
      }
    }
    if (id === 'mars') {
      const atmo = marsAtmosphere(world)
      u.uTerraform.value = clamp((atmo.pressureBar - 0.01) / 0.6, 0, 1)
    }
    if (visual.glow) {
      const gu = (visual.glow.material as ShaderMaterial).uniforms
      gu.uCenter.value.copy(pos)
      gu.uSunPos.value.set(0, 0, 0)
      if (id === 'mars') gu.uStrength.value = 0.35 + 0.65 * u.uTerraform.value
      if (id === 'earth') gu.uStrength.value = temp > 300 ? 0.35 : 1
    }
    // 충돌 흔적과 기지 불빛
    const marks = u.uMarks.value as Vector4[]
    const info = u.uMarkInfo.value as Vector4[]
    for (const m of marks) m.set(0, 0, 0, 0)
    let n = 0
    const hits = world.impacts.filter(
      (im) => im.target === id && im.status === 'hit' && im.outcome,
    )
    for (const im of hits.slice(-6)) {
      const o = im.outcome!
      const body = BODIES[id]
      const age = world.year - im.impactYear
      if (o.scarKm) {
        if (age > 3) continue
        marks[n].set(
          im.site[0],
          im.site[1],
          im.site[2],
          clamp((o.scarKm / body.radiusKm) * 1.2, 0.05, 0.7),
        )
        info[n].set(2, clamp(1 - age / 3, 0, 1), 0, 0)
      } else if (o.craterKm) {
        marks[n].set(
          im.site[0],
          im.site[1],
          im.site[2],
          clamp((o.craterKm / body.radiusKm) * 1.5, 0.035, 0.8),
        )
        info[n].set(1, 1, clamp(Math.exp(-age / 0.05), 0, 1), 0)
      } else continue
      n++
    }
    const colony = COLONY_SITES[id]
    if (colony && n < MAX_MARKS) {
      const people = colonyPopulation(world, colony.kind)
      if (people > 0) {
        marks[n].set(
          colony.dir.x,
          colony.dir.y,
          colony.dir.z,
          0.12 + 0.12 * clamp(Math.log10(people) / 6, 0, 1),
        )
        info[n].set(3, clamp(Math.log10(people) / 5, 0.3, 1.2), 0, 0)
      }
    }
  }

  function updateHazards(world: WorldState, ctx: FrameContext) {
    // 다가오는 충돌체
    const incoming = world.impacts.filter((im) => im.status === 'incoming')
    impactors.forEach((slot, i) => {
      const im = incoming[i]
      const targetPos = im ? positions.get(im.target) : undefined
      if (!im || !targetPos) {
        slot.group.visible = false
        slot.path.visible = false
        return
      }
      const left = im.impactYear - world.year
      const distanceAu =
        left * IMPACTOR_KINDS[im.kind].speedKms * KMS_TO_AU_PER_YEAR
      const dir = toVector(eclipticToScene(im.approach)).normalize()
      const radius = bodyVisualRadius(im.target)
      const far = radius * 1.05 + 12 * distanceAu ** 0.6
      slot.group.visible = distanceAu < 3
      slot.group.position.copy(dir).multiplyScalar(far).add(targetPos)
      slot.tail.visible = im.kind === 'comet'
      if (slot.tail.visible) {
        faceCamera(slot.tail, ctx.camera)
        slot.tail.scale.setScalar(0.5)
      }
      const scale = 0.04 + clamp(Math.log10(im.diameterM) / 50, 0, 0.08)
      slot.rock.scale.setScalar(scale)
      slot.path.visible = true
      setLine(slot.path, [
        targetPos.clone(),
        dir
          .clone()
          .multiplyScalar(radius + 12 * Math.max(distanceAu, 0.2) ** 0.6)
          .add(targetPos),
      ])
    })
    // 충돌 섬광
    for (const im of world.impacts) {
      if (im.status !== 'hit' || seenHits.has(impactKey(im))) continue
      seenHits.add(impactKey(im))
      if (ctx.reducedMotion) continue
      const mesh = makeGlow('#fff2c4', 1, 1.6, 1)
      scene.add(mesh)
      flashes.push({
        mesh,
        start: ctx.elapsed,
        body: im.target,
        dir: new Vector3(...im.site),
        size: bodyVisualRadius(im.target) * 2.4,
      })
    }
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i]
      const t = (ctx.elapsed - f.start) / 1.8
      const visual = visuals.get(f.body)
      if (t > 1 || !visual) {
        scene.remove(f.mesh)
        disposeObject(f.mesh)
        flashes.splice(i, 1)
        continue
      }
      const surface = f.dir
        .clone()
        .applyQuaternion(visual.spin.quaternion)
        .multiplyScalar(visual.radius * 1.02)
      f.mesh.position.copy(visual.group.position).add(surface)
      f.mesh.scale.setScalar(f.size * (0.3 + t * 1.4))
      ;(f.mesh.material as ShaderMaterial).uniforms.uIntensity.value =
        1.6 * (1 - t) ** 1.5
      faceCamera(f.mesh, ctx.camera)
    }
    // 태양 폭풍
    const active = world.storms.filter((s) => {
      const r = stormFrontAu(s, world.year, STORM_CLASSES[s.cls].speedKms)
      return r > 0 && r < 45
    })
    storms.forEach((mesh, i) => {
      const storm = active[i]
      if (!storm) {
        mesh.visible = false
        return
      }
      const spec = STORM_CLASSES[storm.cls]
      const r = stormFrontAu(storm, world.year, spec.speedKms)
      mesh.visible = true
      mesh.geometry = stormCap(spec.halfAngle)
      const dir = toVector(
        eclipticToScene([
          Math.cos(storm.longitude * DEG),
          Math.sin(storm.longitude * DEG),
          0,
        ]),
      )
      mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), dir)
      mesh.scale.setScalar(Math.max(sceneDistance(r, mode), sunRadius * 1.05))
      const material = mesh.material as ShaderMaterial
      // 가산 혼합이라 1을 넘기면 앞부분이 하얗게 빛남
      material.uniforms.uOpacity.value = 1.3 * clamp(1 - r / 45, 0.2, 1)
      material.uniforms.uTime.value = ctx.elapsed
    })
    // 별 폭발
    const blasts = world.blasts.slice(-blastSprites.length)
    blastSprites.forEach((slot, i) => {
      const b = blasts[i]
      if (!b) {
        slot.glow.visible = false
        slot.remnant.visible = false
        return
      }
      if (!blastSeen.has(blastKey(b))) blastSeen.set(blastKey(b), ctx.elapsed)
      const realAge = ctx.elapsed - blastSeen.get(blastKey(b))!
      const simAge = world.year - b.year
      const dir = raDecToScene(b.ra, b.dec)
      // 광도 곡선: 2주 동안 밝아지고 1년에 걸쳐 어두워짐 (빠른 재생에서도 몇 초는 보이게)
      const curve = Math.max(
        simAge < 0.04 ? simAge / 0.04 : Math.exp(-(simAge - 0.04) / 0.5),
        Math.exp(-realAge / 2.5),
      )
      const brightness =
        b.magnitude === null ? 2.5 : clamp((-b.magnitude - 4) / 8, 0.3, 3)
      slot.glow.visible = curve > 0.01
      slot.glow.position.copy(dir).multiplyScalar(7000)
      slot.glow.scale.setScalar(400 + 900 * brightness * curve)
      ;(slot.glow.material as ShaderMaterial).uniforms.uIntensity.value =
        curve * Math.min(1.6, brightness)
      faceCamera(slot.glow, ctx.camera)
      // 잔해 성운 (100광년 안)
      const remnantAge = Math.max(0, simAge)
      slot.remnant.visible =
        b.kind === 'supernova' && b.distanceLy <= 600 && remnantAge < 2e4
      if (slot.remnant.visible) {
        const angle = Math.atan((remnantAge * 0.0167) / b.distanceLy)
        const size = 7000 * Math.tan(Math.min(angle, 1.2)) + 60
        slot.remnant.position.copy(dir).multiplyScalar(7000)
        slot.remnant.scale.setScalar(size)
        const mu = (slot.remnant.material as ShaderMaterial).uniforms
        mu.uOpacity.value = 0.35 * clamp(1 - remnantAge / 2e4, 0, 1)
        mu.uTime.value = ctx.elapsed * 0.2
      }
    })
    const flash = blasts.reduce((max, b) => {
      const realAge = ctx.elapsed - (blastSeen.get(blastKey(b)) ?? -99)
      const strong =
        b.ozoneLoss > 0.05 ||
        (b.magnitude !== null && b.magnitude < -12) ||
        b.kind === 'grb'
      return strong && !ctx.reducedMotion
        ? Math.max(max, Math.exp(-realAge / 0.8))
        : max
    }, 0)
    ;(sky.sky.material as ShaderMaterial).uniforms.uTint.value.setRGB(
      0.25 * flash,
      0.27 * flash,
      0.35 * flash,
    )

    // 지나가는 천체
    const flyby = activeFlyby(world)
    if (flyby) {
      const p = intruderPositionAu(world, flyby)
      const r = length(p)
      intruder.visible = r < 2500
      intruderPath.visible = intruder.visible
      if (intruder.visible) {
        const spec = INTRUDERS[flyby.kind]
        intruder.position.copy(toVector(toScene(p, mode)))
        intruderStar.visible = !spec.blackHole
        intruderGlow.visible = !spec.blackHole && flyby.kind !== 'rogueJupiter'
        intruderHole.visible = spec.blackHole
        const size =
          flyby.kind === 'rogueJupiter'
            ? bodyVisualRadius('jupiter')
            : spec.blackHole
              ? 1.6
              : 1.6 * (flyby.massSun / 1) ** 0.4
        intruderStar.scale.setScalar(size)
        ;(intruderStar.material as MeshBasicMaterial).color.set(
          flyby.kind === 'rogueJupiter' ? '#3b2f28' : spec.color,
        )
        intruderGlow.scale.setScalar(size * 6)
        ;(intruderGlow.material as ShaderMaterial).uniforms.uColor.value.set(
          spec.color,
        )
        faceCamera(intruderGlow, ctx.camera)
        intruderHole.scale.setScalar(size * 2.4)
        faceCamera(intruderHole, ctx.camera)
        ;(intruderHole.material as ShaderMaterial).uniforms.uTime.value =
          ctx.elapsed
        intruderPick.scale.setScalar(Math.max(size * 1.5, 0.6))
        const { bVec, vHat } = flybyGeometry(
          flyby.closestAu + flyby.shiftAu,
          flyby.inclination,
          flyby.longitude,
        )
        const span =
          Math.max(flyby.closestAu * 6, 120) /
          (flyby.speedKms * KMS_TO_AU_PER_YEAR)
        const pts: Vector3[] = []
        for (let k = 0; k <= 80; k++) {
          const t = -span + (2 * span * k) / 80
          pts.push(
            toVector(
              toScene(intruderPosition(bVec, vHat, flyby.speedKms, t), mode),
            ),
          )
        }
        setLine(intruderPath, pts)
      }
    } else {
      intruder.visible = false
      intruderPath.visible = false
    }
  }

  function updateMeteors(world: WorldState, ctx: FrameContext) {
    const earth = positions.get('earth')
    const shower = earth ? currentShower(world) : null
    const posAttr = meteorGeometry.attributes.position as BufferAttribute
    const colAttr = meteorGeometry.attributes.color as BufferAttribute
    const near = earth ? ctx.camera.position.distanceTo(earth) < 30 : false
    if (shower && earth && near && !ctx.reducedMotion) {
      meteorBudget += ctx.dt * Math.min(30, 2 + Math.log10(shower.zhr + 1) * 6)
      const radiant = raDecToScene(
        shower.shower.radiant.ra,
        shower.shower.radiant.dec,
      )
      const radius = bodyVisualRadius('earth')
      for (const m of meteors) {
        if (meteorBudget < 1) break
        if (m.alive > 0) continue
        meteorBudget -= 1
        // 복사점 쪽 반구의 대기 윗면에서 시작해 반대 방향으로 그어짐
        const u = new Vector3(
          meteorRandom() - 0.5,
          meteorRandom() - 0.5,
          meteorRandom() - 0.5,
        ).normalize()
        if (u.dot(radiant) < 0) u.negate()
        m.start.copy(u).multiplyScalar(radius * 1.04)
        const tangent = radiant
          .clone()
          .negate()
          .sub(u.clone().multiplyScalar(-radiant.dot(u)))
          .normalize()
        m.dir
          .copy(tangent)
          .multiplyScalar(radius * (0.18 + meteorRandom() * 0.2))
        m.alive = m.life = 0.4 + meteorRandom() * 0.5
      }
    }
    meteors.forEach((m, i) => {
      if (m.alive <= 0 || !earth) {
        colAttr.setXYZ(i * 2, 0, 0, 0)
        colAttr.setXYZ(i * 2 + 1, 0, 0, 0)
        return
      }
      m.alive -= ctx.dt
      const t = 1 - m.alive / m.life
      const head = m.start
        .clone()
        .add(m.dir.clone().multiplyScalar(t))
        .add(earth)
      const tail = m.start
        .clone()
        .add(m.dir.clone().multiplyScalar(Math.max(0, t - 0.45)))
        .add(earth)
      posAttr.setXYZ(i * 2, head.x, head.y, head.z)
      posAttr.setXYZ(i * 2 + 1, tail.x, tail.y, tail.z)
      const glow = Math.sin(Math.PI * t)
      colAttr.setXYZ(i * 2, 1.4 * glow, 1.3 * glow, 1.1 * glow)
      colAttr.setXYZ(i * 2 + 1, 0, 0, 0)
    })
    posAttr.needsUpdate = true
    colAttr.needsUpdate = true
    // 모혜성 먼지 띠
    for (const points of streams.values()) points.visible = false
    const streamId = shower?.shower.id
    if (streamId && ctx.options.meteorStreams) {
      const points = streamFor(streamId)
      if (points) {
        points.visible = true
        if (points.userData.mode !== mode) {
          const attr = points.geometry.attributes.position as BufferAttribute
          ;(points.userData.raw as Vec3[]).forEach((p, k) => {
            const s = toScene(p, mode)
            attr.setXYZ(k, s[0], s[1], s[2])
          })
          attr.needsUpdate = true
          points.userData.mode = mode
        }
        ;(points.material as ShaderMaterial).uniforms.uPixelRatio.value =
          ctx.pixelRatio
      }
    }
  }

  function updateStructures(world: WorldState, ctx: FrameContext) {
    const capture = dysonCapture(world)
    const swarmCount = Math.round(SWARM * clamp(capture.swarm / 0.01, 0, 1))
    swarm.visible = swarmCount > 0 && !world.sunBlackHole
    if (swarm.visible) {
      const attr = swarmGeometry.attributes.position as BufferAttribute
      const t = ctx.elapsed * 0.05
      swarmData.forEach((d, k) => {
        const r = sceneDistance(d.r, mode)
        const a = d.phase + t * (1 + d.plane * 0.07)
        const tilt = (d.plane / 7) * Math.PI
        const x = Math.cos(a) * r
        const z = Math.sin(a) * r
        attr.setXYZ(k, x, z * Math.sin(tilt), z * Math.cos(tilt))
      })
      attr.needsUpdate = true
      swarmGeometry.setDrawRange(0, swarmCount)
      ;(swarm.material as ShaderMaterial).uniforms.uPixelRatio.value =
        ctx.pixelRatio
    }
    sphereShell.visible = capture.sphere > 0
    if (sphereShell.visible) {
      sphereShell.scale.setScalar(sceneDistance(2, mode))
      ;(sphereLines.material as LineBasicMaterial).opacity =
        0.12 + 0.3 * capture.sphere
      ;(spherePanels.material as MeshBasicMaterial).opacity =
        0.03 + 0.12 * capture.sphere
      sphereShell.rotation.y = ctx.elapsed * 0.01
    }
    ringworld.visible = hasProject(world, 'ringworld')
    if (ringworld.visible) {
      const r = sceneDistance(1.2, mode)
      ringBand.scale.set(r, 6, r)
      shadowSquares.scale.set(r, 6, r)
      ringworld.rotation.y = ctx.elapsed * 0.02
      shadowSquares.rotation.y = -ctx.elapsed * 0.05
    }
    engineMirror.visible =
      hasProject(world, 'stellar-engine') && !world.sunBlackHole
    if (engineMirror.visible) engineMirror.scale.setScalar(sunRadius * 2.6)
    const earth = positions.get('earth')
    const mars = positions.get('mars')
    const toSun = (p: Vector3, d: number) =>
      p.clone().sub(p.clone().normalize().multiplyScalar(d))
    sunshade.visible = Boolean(earth) && hasProject(world, 'sunshade')
    if (sunshade.visible && earth) {
      sunshade.position.copy(toSun(earth, 0.62))
      sunshade.lookAt(0, 0, 0)
    }
    sentinel.visible = Boolean(earth) && hasProject(world, 'sentinel')
    if (sentinel.visible && earth) sentinel.position.copy(toSun(earth, 0.82))
    defenseNet.visible = Boolean(earth) && hasProject(world, 'defense-net')
    if (defenseNet.visible && earth) {
      defenseNet.position.copy(earth)
      defenseNet.scale.setScalar(bodyVisualRadius('earth') * 1.7)
      defenseNet.rotation.y = ctx.elapsed * 0.3
    }
    marsShield.visible = Boolean(mars) && hasProject(world, 'mars-shield')
    marsShieldGlow.visible = marsShield.visible
    if (marsShield.visible && mars) {
      marsShield.position.copy(toSun(mars, 0.7))
      marsShield.lookAt(0, 0, 0)
      marsShieldGlow.position.copy(marsShield.position)
      faceCamera(marsShieldGlow, ctx.camera)
    }
    oneill.visible = Boolean(earth) && hasProject(world, 'oneill')
    if (oneill.visible && earth) {
      // 지구 공전 궤도에서 60° 뒤 (L5)
      const angle = -60 * DEG
      const p = earth.clone().applyAxisAngle(new Vector3(0, 1, 0), angle)
      oneill.position.copy(p)
      oneill.rotation.y = ctx.elapsed * 0.4
    }
    const earthVisual = visuals.get('earth')
    if (earthVisual) {
      const has = hasProject(world, 'space-elevator') && Boolean(earth)
      if (has && !elevator.parent) earthVisual.spin.add(elevator)
      elevator.visible = has
    }
    const tugAge = yearsSinceComplete(world, 'orbit-engine')
    tug.visible = tugAge !== null && Boolean(earth)
    if (tug.visible && earth) {
      const t = ctx.elapsed * 0.25
      tug.position
        .set(Math.cos(t) * 1.6, Math.sin(t * 0.5) * 0.3, Math.sin(t) * 0.7)
        .add(earth)
    }
  }

  const sceneApi: ScaleScene = {
    id: 'solar',
    scene,
    near: 0.005,
    far: 30_000,
    overview: () => ({
      target: new Vector3(0, 0, 0),
      distance: mode === 'linear' ? 520 : 95,
      elevation: 0.62,
    }),
    target(id: string): Target | null {
      if (id === 'sun')
        return { position: new Vector3(0, 0, 0), radius: sunRadius }
      if (id === 'intruder')
        return intruder.visible
          ? { position: intruder.position.clone(), radius: 1.6 }
          : null
      const pos = positions.get(id as BodyId)
      const visual = visuals.get(id as BodyId)
      if (!pos || !visual) return null
      return { position: pos.clone(), radius: visual.radius }
    },
    labelAnchor(id: string, camera: PerspectiveCamera) {
      const target = sceneApi.target(id)
      if (!target) return null
      const body = BODIES[id as BodyId]
      if (body?.parent) {
        // 위성 이름은 모행성 가까이 갔을 때만
        const parent = positions.get(body.parent)
        if (
          !parent ||
          camera.position.distanceTo(parent) >
            bodyVisualRadius(body.parent) * 26
        )
          return null
      }
      return target
    },
    pick(raycaster: Raycaster) {
      const hits = raycaster.intersectObjects(
        [...pickables, intruderPick],
        false,
      )
      for (const hit of hits) {
        const id = hit.object.userData.id as string | undefined
        if (id && hit.object.parent?.visible !== false) return id
      }
      return null
    },
    update(ctx: FrameContext) {
      const world = ctx.world
      if (world.nextId < lastNextId || world.year < lastWorldYear) {
        // 이전 세계의 충돌·폭발 기록이 새 세계의 같은 id를 가리지 않도록 비움
        seenHits.clear()
        blastSeen.clear()
        for (const f of flashes) {
          scene.remove(f.mesh)
          disposeObject(f.mesh)
        }
        flashes.length = 0
      }
      lastNextId = world.nextId
      lastWorldYear = world.year
      mode = ctx.options.distanceMode
      const sun = sunState(world)
      // 태양
      sunRadius = sun.blackHole ? 0.6 : sunVisualRadius(sun.radius, mode)
      const [r, g, b] = blackbodyColor(sun.temperature)
      const sunColor = new Color(r, g, b)
      sunMesh.visible = !sun.blackHole
      corona.visible = !sun.blackHole
      sunHole.visible = sun.blackHole
      sunMesh.scale.setScalar(sunRadius)
      // 흑체 색은 거의 흰색이라 화면에서는 따뜻하게 (뜨거운 백색 왜성은 그대로)
      const warmth = clamp((9000 - sun.temperature) / 4000, 0, 1) * 0.55
      sunMaterial.uniforms.uColor.value
        .setRGB(r, g, b)
        .lerp(new Color(1, 0.62, 0.22), warmth)
        .multiplyScalar(1.05)
      sunMaterial.uniforms.uTime.value = ctx.reducedMotion ? 0 : ctx.elapsed
      sunMaterial.uniforms.uGiant.value = clamp(
        Math.log10(sun.radius) / 2,
        0,
        1,
      )
      const lum = Math.max(sun.luminosity, 1e-6)
      corona.scale.setScalar(
        sunRadius * (sun.stage === 'whiteDwarf' ? 14 : 4.6),
      )
      ;(corona.material as ShaderMaterial).uniforms.uColor.value.copy(sunColor)
      ;(corona.material as ShaderMaterial).uniforms.uIntensity.value = clamp(
        0.55 + 0.18 * Math.log10(lum),
        0.25,
        1.2,
      )
      ;(corona.material as ShaderMaterial).uniforms.uTime.value = ctx.elapsed
      faceCamera(corona, ctx.camera)
      sunHole.scale.setScalar(2.4)
      faceCamera(sunHole, ctx.camera)
      ;(sunHole.material as ShaderMaterial).uniforms.uTime.value = ctx.elapsed
      sunPick.scale.setScalar(Math.max(sunRadius, 0.8))
      nebula.visible =
        sun.stage === 'planetaryNebula' ||
        (sun.stage === 'whiteDwarf' && sun.ageGyr < 12.368)
      if (nebula.visible) {
        const t = clamp((sun.ageGyr - 12.365) / 0.003, 0, 1)
        nebula.scale.setScalar(120 + 2400 * t)
        const nu = (nebula.material as ShaderMaterial).uniforms
        nu.uOpacity.value = 0.4 * (1 - t)
        nu.uTime.value = ctx.elapsed * 0.1
      }

      // 위치
      positions.clear()
      for (const id of BODY_IDS) {
        if (id === 'sun' || BODIES[id].parent) continue
        const p = scenePosition(world, id)
        if (p) positions.set(id, p)
      }
      for (const id of BODY_IDS) {
        if (!BODIES[id].parent) continue
        const p = scenePosition(world, id)
        if (p) positions.set(id, p)
      }
      for (const visual of visuals.values())
        updateBody(visual, world, ctx, sunColor)

      updateOrbits(world, ctx.selected, ctx.options.orbits, ctx.elapsed)

      // 띠
      // 질량을 잃은 태양 둘레에서는 행성처럼 띠의 공전도 느려짐 (공전 시계)
      const days = ((orbitClockYear(world.orbitYear) - 2000) % 1000) * 365.25
      for (const belt of [asteroidBelt, kuiperBelt]) {
        const u = (belt.material as ShaderMaterial).uniforms
        u.uDays.value = days
        u.uLinear.value = mode === 'linear' ? 1 : 0
        u.uExpand.value = 1 / sun.mass
        u.uPixelRatio.value = ctx.pixelRatio
        u.uSize.value = mode === 'linear' ? 4 : 1
      }

      // 거주 가능 영역
      hz.visible = ctx.options.habitableZone && !sun.blackHole
      if (hz.visible) {
        const zone = habitableZoneNow(world)
        const inner = sceneDistance(zone.inner, mode)
        const outer = sceneDistance(zone.outer, mode)
        const key = `${inner.toPrecision(3)}|${outer.toPrecision(3)}`
        if (key !== hzKey) {
          hzKey = key
          hz.geometry.dispose()
          hz.geometry = new RingGeometry(inner, outer, 160, 1).rotateX(
            -Math.PI / 2,
          )
        }
      }

      // 선택
      const target = ctx.selected ? sceneApi.target(ctx.selected) : null
      shell.visible = Boolean(target)
      if (target) {
        shell.position.copy(target.position)
        shell.scale.setScalar(
          target.radius * (ctx.selected === 'sun' ? 1.3 : 1.7),
        )
        if (!ctx.reducedMotion) shell.rotation.y = ctx.elapsed * 0.08
      }

      updateHazards(world, ctx)
      updateMeteors(world, ctx)
      updateStructures(world, ctx)
      // 핼리 혜성 꼬리 (태양 가까이에서만)
      const halley = visuals.get('halley')
      const halleyAu = bodyPositionAu(world, 'halley')
      if (halley && halleyAu) {
        const r = length(halleyAu)
        let tail = halley.group.userData.tail as Mesh | undefined
        if (!tail) {
          tail = makeGlow('#bfe3ff', 1, 0.8)
          halley.group.add(tail)
          halley.group.userData.tail = tail
        }
        tail.visible = r < 5
        if (tail.visible) {
          const away = halley.group.position.clone().normalize()
          tail.position.copy(away.multiplyScalar(0.6))
          tail.scale.setScalar(clamp(2.4 / r, 0.3, 4))
          faceCamera(tail, ctx.camera)
        }
      }
      ;(sky.stars.material as ShaderMaterial).uniforms.uPixelRatio.value =
        ctx.pixelRatio
      tmp.set(0, 0, 0)
    },
    dispose() {
      disposeObject(scene)
      for (const cap of stormCaps.values()) cap.dispose()
    },
  }
  return sceneApi
}
