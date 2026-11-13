import {
  PerspectiveCamera,
  Raycaster,
  Spherical,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { ScaleId } from '../../model/view'
import type { CollisionInfo } from '../../model/local/collisionInfo'
import type {
  FrameContext,
  LabelPosition,
  RenderState,
  ScaleScene,
  SceneEnv,
} from './types'
import { createSolarScene } from './solar/SolarScene'
import { createStarsScene } from './stars/StarsScene'
import { createGalaxyScene } from './galaxy/GalaxyScene'
import { createLocalScene } from './local/LocalScene'
import { createCosmicScene } from './cosmic/CosmicScene'

const FACTORIES: Record<ScaleId, (env: SceneEnv) => ScaleScene> = {
  solar: createSolarScene,
  stars: createStarsScene,
  galaxy: createGalaxyScene,
  local: createLocalScene,
  cosmic: createCosmicScene,
}

export interface EngineOptions {
  /** 그릴 캔버스: 워커에서는 메인 스레드가 넘겨준 OffscreenCanvas */
  canvas: HTMLCanvasElement | OffscreenCanvas
  /** OrbitControls가 듣는 요소: 메인 스레드면 실제 캔버스, 워커면 입력을 넘겨받는 대리 요소 */
  input: HTMLElement
  /** 캔버스 크기 (CSS 픽셀) */
  width: number
  height: number
  pixelRatio: number
  smallTextures: boolean
  /** 프레임마다 보이는 이름표의 위치 */
  onLabels: (labels: LabelPosition[]) => void
  onCollision: (info: CollisionInfo) => void
  /** 첫 장면을 처음 그렸을 때 */
  onReady: () => void
  /** WebGL을 쓸 수 없거나 그리다가 멈췄을 때 */
  onError: (error: unknown) => void
}

/** 셰이더를 미리 컴파일하며 기다리는 최대 시간 (지나면 첫 그리기 때 마저 컴파일) */
const COMPILE_WAIT_MS = 4000

// 워커에서도 requestAnimationFrame이 있으면 쓰고, 없으면 약 60fps로
const nextFrame = (callback: (now: number) => void): number =>
  typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame(callback)
    : (setTimeout(() => callback(performance.now()), 16) as unknown as number)
const cancelFrame = (id: number) =>
  typeof cancelAnimationFrame === 'function'
    ? cancelAnimationFrame(id)
    : clearTimeout(id)

/**
 * three.js 렌더러·카메라·조작과 규모별 장면.
 * DOM과 Solid 상태를 직접 읽지 않으므로 워커(OffscreenCanvas)와 메인 스레드 어디서든 돕니다.
 */
export class Engine {
  private renderer: WebGLRenderer
  private camera: PerspectiveCamera
  private controls: OrbitControls
  private scenes = new Map<ScaleId, ScaleScene>()
  private current: ScaleScene | null = null
  private state: RenderState | null = null
  private width: number
  private height: number
  private frame = 0
  private last = performance.now()
  private elapsed = 0
  private lastFocus: string | null | undefined = undefined
  private lastIntro = true
  /** 전체 보기 거리 (압축↔실제 거리 보기를 바꾸면 달라짐) */
  private lastOverviewDistance = 0
  /** 대상을 바꾼 뒤 다가가는 목표 거리 (사용자가 직접 확대하면 취소) */
  private flyDistance: number | null = null
  /** 셰이더 컴파일을 마친 장면 */
  private compiled = new Set<ScaleId>()
  /** 장면별 컴파일을 시작한 시각 (오래 걸리면 기다리지 않고 그림) */
  private compileStarted = new Map<ScaleId, number>()
  private ready = false
  private disposed = false

  constructor(private options: EngineOptions) {
    this.width = options.width
    this.height = options.height
    this.renderer = new WebGLRenderer({
      canvas: options.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    })
    // 셰이더 오류 검사(getProgramInfoLog 등)는 GPU 작업이 끝날 때까지 기다리는 동기 호출이라 개발 때만
    this.renderer.debug.checkShaderErrors = import.meta.env.DEV
    // three.js는 첫 텍스처를 올릴 때 비등방성 필터 확장을 처음 묻는데, 그 동기 호출이
    // 셰이더 컴파일이 다 끝날 때까지 스레드를 붙잡으므로 GPU가 한가한 지금 미리 물어 둠
    this.renderer.capabilities.getMaxAnisotropy()
    this.camera = new PerspectiveCamera(45, 1, 0.01, 20_000)
    this.controls = new OrbitControls(this.camera, options.input)
    this.controls.enablePan = false
    this.controls.rotateSpeed = 0.5
    this.controls.zoomSpeed = 0.8
    this.controls.autoRotateSpeed = 0.25
    this.controls.addEventListener('start', () => {
      this.flyDistance = null
    })
    // 첫 프레임 전에는 천체 위치가 없으므로 전체 모습에서 시작
    this.camera.position.set(0, 40, 80)
    this.resize(options.width, options.height, options.pixelRatio)
    this.frame = nextFrame(this.loop)
  }

  /** 메인 스레드의 화면 상태 (바뀔 때마다 받음) */
  setState(state: RenderState) {
    this.state = state
  }

  resize(width: number, height: number, pixelRatio: number) {
    if (!width || !height) return
    this.width = width
    this.height = height
    this.renderer.setPixelRatio(pixelRatio)
    // 캔버스의 CSS 크기는 메인 스레드가 정하므로 그리기 버퍼만 바꿈
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }

  private sceneFor(id: ScaleId): ScaleScene {
    let scene = this.scenes.get(id)
    if (!scene) {
      scene = FACTORIES[id]({ smallTextures: this.options.smallTextures })
      this.scenes.set(id, scene)
      // 셰이더를 병렬로 미리 컴파일해 첫 렌더링 때 멈추지 않게 함
      this.compileStarted.set(id, performance.now())
      this.renderer
        .compileAsync(scene.scene, this.camera)
        .catch(() => {})
        .finally(() => this.compiled.add(id))
    }
    return scene
  }

  private applyCameraRange(scene: ScaleScene) {
    this.camera.near = scene.near
    this.camera.far = scene.far
    this.camera.updateProjectionMatrix()
  }

  /** 화면 좌표(−1~1)에 있는 천체 (없으면 null) */
  pick(x: number, y: number): string | null {
    if (!this.current) return null
    const raycaster = new Raycaster()
    raycaster.setFromCamera(new Vector2(x, y), this.camera)
    return this.current.pick(raycaster)
  }

  /** 대상 둘레로 돌리기 (라디안) */
  rotate(dTheta: number, dPhi: number) {
    const offset = this.camera.position.clone().sub(this.controls.target)
    const s = new Spherical().setFromVector3(offset)
    s.theta += dTheta
    s.phi = Math.min(Math.PI - 0.05, Math.max(0.05, s.phi + dPhi))
    this.camera.position
      .copy(this.controls.target)
      .add(new Vector3().setFromSpherical(s))
    this.controls.update()
  }

  zoom(factor: number) {
    this.flyDistance = null
    const offset = this.camera.position.clone().sub(this.controls.target)
    const distance = Math.min(
      this.controls.maxDistance,
      Math.max(this.controls.minDistance, offset.length() * factor),
    )
    this.camera.position
      .copy(this.controls.target)
      .add(offset.setLength(distance))
    this.controls.update()
  }

  private loop = (now: number) => {
    if (this.disposed) return
    this.frame = nextFrame(this.loop)
    const dt = Math.min((now - this.last) / 1000, 0.1)
    this.last = now
    this.elapsed += dt
    try {
      this.render(dt)
    } catch (error) {
      this.options.onError(error)
      this.dispose()
    }
  }

  private render(dt: number) {
    const state = this.state
    if (!state) return
    const reduced = state.reducedMotion
    const scaleId = state.scale
    if (!this.current || this.current.id !== scaleId) {
      const first = !this.current
      this.current = this.sceneFor(scaleId)
      this.applyCameraRange(this.current)
      this.lastFocus = undefined
      // 새 규모는 전체 모습에서 시작 (첫 장면은 소개 화면처럼 멀리서 다가옴)
      if (!first) {
        const view = this.current.overview()
        this.controls.target.copy(view.target)
        this.camera.position
          .copy(view.target)
          .add(
            new Vector3(
              0,
              Math.sin(view.elevation),
              Math.cos(view.elevation),
            ).multiplyScalar(view.distance),
          )
      }
    }
    const scene = this.current
    const view = state.options
    const introOn = state.intro
    const focusId = introOn && scaleId === 'solar' ? 'earth' : state.focus
    // 소개 화면에서는 선택 표시와 이름표를 감춤
    const selectedId = introOn ? null : state.selection[scaleId]
    const ctx: FrameContext = {
      world: state.world,
      selected: selectedId,
      focus: focusId,
      // 소개 화면은 동심원 장식만 보이도록 궤도선을 감춤
      options: introOn ? { ...view, orbits: false } : view,
      cosmicAge: state.cosmicAge,
      camera: this.camera,
      elapsed: this.elapsed,
      dt,
      reducedMotion: reduced,
      pixelRatio: this.renderer.getPixelRatio(),
      reportCollision: this.options.onCollision,
    }
    scene.update(ctx)

    // 카메라: 대상을 따라가며 부드럽게 다가감
    const target = focusId ? scene.target(focusId) : null
    const overview = scene.overview()
    // 따라가는 대상이 없을 때 거리 보기 방식이 바뀌면 새 전체 모습에 맞춰 다시 물러남
    const overviewChanged =
      !focusId && overview.distance !== this.lastOverviewDistance
    if (
      focusId !== this.lastFocus ||
      introOn !== this.lastIntro ||
      overviewChanged
    ) {
      this.flyDistance = target
        ? target.radius * (introOn ? 3.4 : 5.5)
        : overview.distance
      this.lastFocus = focusId
      this.lastIntro = introOn
    }
    this.lastOverviewDistance = overview.distance
    const goal = target ? target.position : overview.target
    const k = reduced ? 1 : 1 - Math.exp(-dt * 3.5)
    const before = this.controls.target.clone()
    this.controls.target.lerp(goal, k)
    this.camera.position.add(this.controls.target.clone().sub(before))
    if (this.flyDistance !== null) {
      const offset = this.camera.position.clone().sub(this.controls.target)
      // 카메라가 대상과 겹치면 방향을 정할 수 없으므로 비스듬히 위쪽에서
      if (offset.lengthSq() < 1e-12) offset.set(0.55, 0.3, 1)
      const distance = offset.length()
      const next = distance + (this.flyDistance - distance) * k
      this.camera.position
        .copy(this.controls.target)
        .add(offset.setLength(next))
      if (Math.abs(next - this.flyDistance) / this.flyDistance < 0.002)
        this.flyDistance = null
    }
    this.controls.minDistance = target
      ? target.radius * 1.35
      : overview.distance * 0.02
    this.controls.maxDistance = overview.distance * 4
    this.controls.enableDamping = !reduced
    this.controls.autoRotate = !introOn && (view.autoRotate ?? !reduced)
    this.controls.update()

    if (!this.compiled.has(scene.id)) {
      // 워커의 OffscreenCanvas는 아무것도 그리지 않으면 GL 명령을 GPU로 넘기지 않아
      // 병렬 컴파일이 시작되지 않을 수 있으므로 재촉하고, 너무 오래 걸리면 기다리지 않고 그림
      this.renderer.getContext().flush()
      const started = this.compileStarted.get(scene.id) ?? 0
      if (performance.now() - started > COMPILE_WAIT_MS)
        this.compiled.add(scene.id)
    }
    if (this.compiled.has(scene.id)) {
      this.renderer.render(scene.scene, this.camera)
      this.options.onLabels(
        introOn ? [] : this.labelPositions(scene, state, selectedId),
      )
      if (!this.ready) {
        this.ready = true
        this.options.onReady()
      }
    }
  }

  private labelPositions(
    scene: ScaleScene,
    state: RenderState,
    selectedId: string | null,
  ): LabelPosition[] {
    const { width, height } = this
    const projected = new Vector3()
    const fovScale = height / (2 * Math.tan((this.camera.fov * Math.PI) / 360))
    const result: LabelPosition[] = []
    for (const id of state.labelIds) {
      const anchor = scene.labelAnchor(id, this.camera)
      if (!anchor) continue
      const distance = this.camera.position.distanceTo(anchor.position)
      // 화면에서 천체 반지름이 크면 이름을 천체 한가운데에 (Space Advisor처럼)
      const pixelRadius = (anchor.radius / Math.max(distance, 1e-6)) * fovScale
      const centered = id === selectedId && pixelRadius > 46
      projected.copy(anchor.position).project(this.camera)
      if (projected.z > 1 || projected.z < -1) continue
      const x = (projected.x * 0.5 + 0.5) * width
      const y =
        (-projected.y * 0.5 + 0.5) * height +
        (centered ? 0 : Math.max(pixelRadius, 3) + 12)
      if (x < -60 || x > width + 60 || y < -20 || y > height + 20) continue
      result.push({ id, x, y, centered })
    }
    return result
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    cancelFrame(this.frame)
    this.controls.dispose()
    for (const scene of this.scenes.values()) scene.dispose()
    this.renderer.dispose()
  }
}
