import {
  PerspectiveCamera,
  Raycaster,
  Spherical,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { currentWorld } from '../../model/world/store'
import { focus, intro, options, scale, selection } from '../../model/view'
import type { ScaleId } from '../../model/view'
import type { FrameContext, ScaleScene } from './types'
import { createSolarScene } from './solar/SolarScene'
import { createStarsScene } from './stars/StarsScene'
import { createGalaxyScene } from './galaxy/GalaxyScene'
import { createLocalScene } from './local/LocalScene'
import { createCosmicScene } from './cosmic/CosmicScene'

const FACTORIES: Record<ScaleId, () => ScaleScene> = {
  solar: createSolarScene,
  stars: createStarsScene,
  galaxy: createGalaxyScene,
  local: createLocalScene,
  cosmic: createCosmicScene,
}

export interface EngineOptions {
  container: HTMLElement
  onPick: (id: string) => void
  reducedMotion: () => boolean
  /** WebGL을 쓸 수 없을 때 */
  onError: (error: unknown) => void
}

export class Engine {
  private renderer: WebGLRenderer
  private camera: PerspectiveCamera
  private controls: OrbitControls
  private scenes = new Map<ScaleId, ScaleScene>()
  private current: ScaleScene
  private labels = new Map<string, HTMLElement>()
  private frame = 0
  private last = performance.now()
  private elapsed = 0
  private lastFocus: string | null | undefined = undefined
  private lastIntro = true
  /** 대상을 바꾼 뒤 다가가는 목표 거리 (사용자가 직접 확대하면 취소) */
  private flyDistance: number | null = null
  private pointerDown = new Vector2()
  private resizeObserver: ResizeObserver
  private disposed = false

  constructor(private options: EngineOptions) {
    const { container } = options
    this.renderer = new WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    // 셰이더 오류 검사(getProgramInfoLog 등)는 GPU 작업이 끝날 때까지 기다리는 동기 호출이라 개발 때만
    this.renderer.debug.checkShaderErrors = import.meta.env.DEV
    // three.js는 첫 텍스처를 올릴 때 비등방성 필터 확장을 처음 묻는데, 그 동기 호출이
    // 셰이더 컴파일이 다 끝날 때까지 메인 스레드를 붙잡으므로 GPU가 한가한 지금 미리 물어 둠
    this.renderer.capabilities.getMaxAnisotropy()
    this.renderer.domElement.setAttribute('aria-hidden', 'true')
    container.appendChild(this.renderer.domElement)
    this.camera = new PerspectiveCamera(45, 1, 0.01, 20_000)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enablePan = false
    this.controls.rotateSpeed = 0.5
    this.controls.zoomSpeed = 0.8
    this.controls.autoRotateSpeed = 0.25
    this.controls.addEventListener('start', () => {
      this.flyDistance = null
    })
    this.current = this.sceneFor(scale())
    this.applyCameraRange()
    // 첫 프레임 전에는 천체 위치가 없으므로 전체 모습에서 시작
    this.camera.position.set(0, 40, 80)
    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(container)
    this.resize()
    const canvas = this.renderer.domElement
    canvas.addEventListener('pointerdown', this.onPointerDown)
    canvas.addEventListener('pointerup', this.onPointerUp)
    this.frame = requestAnimationFrame(this.loop)
  }

  /** 셰이더 컴파일을 마친 장면 */
  private compiled = new Set<ScaleId>()

  private sceneFor(id: ScaleId): ScaleScene {
    let scene = this.scenes.get(id)
    if (!scene) {
      scene = FACTORIES[id]()
      this.scenes.set(id, scene)
      // 셰이더를 병렬로 미리 컴파일해 첫 렌더링 때 메인 스레드가 멈추지 않게 함
      this.renderer
        .compileAsync(scene.scene, this.camera)
        .catch(() => {})
        .finally(() => this.compiled.add(id))
    }
    return scene
  }

  private applyCameraRange() {
    this.camera.near = this.current.near
    this.camera.far = this.current.far
    this.camera.updateProjectionMatrix()
  }

  private resize = () => {
    const { clientWidth, clientHeight } = this.options.container
    if (!clientWidth || !clientHeight) return
    this.renderer.setSize(clientWidth, clientHeight, false)
    this.renderer.domElement.style.width = '100%'
    this.renderer.domElement.style.height = '100%'
    this.camera.aspect = clientWidth / clientHeight
    this.camera.updateProjectionMatrix()
  }

  private onPointerDown = (event: PointerEvent) => {
    this.pointerDown.set(event.clientX, event.clientY)
  }

  private onPointerUp = (event: PointerEvent) => {
    if (
      this.pointerDown.distanceTo(new Vector2(event.clientX, event.clientY)) > 6
    )
      return
    const rect = this.renderer.domElement.getBoundingClientRect()
    const ndc = new Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    )
    const raycaster = new Raycaster()
    raycaster.setFromCamera(ndc, this.camera)
    const id = this.current.pick(raycaster)
    if (id) this.options.onPick(id)
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

  setLabels(map: Map<string, HTMLElement>) {
    this.labels = map
  }

  private loop = (now: number) => {
    if (this.disposed) return
    this.frame = requestAnimationFrame(this.loop)
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
    const reduced = this.options.reducedMotion()
    const scaleId = scale()
    if (this.current.id !== scaleId) {
      this.current = this.sceneFor(scaleId)
      this.applyCameraRange()
      this.lastFocus = undefined
      // 새 규모는 전체 모습에서 시작
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
    const view = options()
    const introOn = intro()
    const focusId = introOn && scaleId === 'solar' ? 'earth' : focus()
    // 소개 화면에서는 선택 표시와 이름표를 감춤
    const selectedId = introOn ? null : selection()[scaleId]
    const ctx: FrameContext = {
      world: currentWorld(),
      selected: selectedId,
      focus: focusId,
      // 소개 화면은 동심원 장식만 보이도록 궤도선을 감춤
      options: introOn ? { ...view, orbits: false } : view,
      camera: this.camera,
      elapsed: this.elapsed,
      dt,
      reducedMotion: reduced,
      pixelRatio: this.renderer.getPixelRatio(),
    }
    this.current.update(ctx)

    // 카메라: 대상을 따라가며 부드럽게 다가감
    const target = focusId ? this.current.target(focusId) : null
    const overview = this.current.overview()
    if (focusId !== this.lastFocus || introOn !== this.lastIntro) {
      this.flyDistance = target
        ? target.radius * (introOn ? 3.4 : 5.5)
        : overview.distance
      this.lastFocus = focusId
      this.lastIntro = introOn
    }
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

    if (this.compiled.has(this.current.id)) {
      this.renderer.render(this.current.scene, this.camera)
      this.updateLabels(selectedId)
    }
  }

  private updateLabels(selectedId: string | null) {
    if (intro()) {
      for (const el of this.labels.values()) el.style.visibility = 'hidden'
      return
    }
    const width = this.renderer.domElement.clientWidth
    const height = this.renderer.domElement.clientHeight
    const projected = new Vector3()
    for (const [id, el] of this.labels) {
      const anchor = this.current.labelAnchor(id, this.camera)
      if (!anchor) {
        el.style.visibility = 'hidden'
        continue
      }
      const distance = this.camera.position.distanceTo(anchor.position)
      // 화면에서 천체 반지름이 크면 이름을 천체 한가운데에 (Space Advisor처럼)
      const fovScale =
        height / (2 * Math.tan((this.camera.fov * Math.PI) / 360))
      const pixelRadius = (anchor.radius / Math.max(distance, 1e-6)) * fovScale
      const centered = id === selectedId && pixelRadius > 46
      projected.copy(anchor.position).project(this.camera)
      if (projected.z > 1 || projected.z < -1) {
        el.style.visibility = 'hidden'
        continue
      }
      const x = (projected.x * 0.5 + 0.5) * width
      const y =
        (-projected.y * 0.5 + 0.5) * height +
        (centered ? 0 : Math.max(pixelRadius, 3) + 12)
      if (x < -60 || x > width + 60 || y < -20 || y > height + 20) {
        el.style.visibility = 'hidden'
        continue
      }
      el.style.visibility = 'visible'
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`
      el.dataset.mode = centered ? 'center' : 'below'
    }
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    cancelAnimationFrame(this.frame)
    this.resizeObserver.disconnect()
    this.controls.dispose()
    for (const scene of this.scenes.values()) scene.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}

export function createEngine(options: EngineOptions) {
  return new Engine(options)
}
