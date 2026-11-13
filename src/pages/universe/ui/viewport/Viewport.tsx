import {
  For,
  Show,
  createSignal,
  createUniqueId,
  onCleanup,
  onMount,
} from 'solid-js'
import { Button, ToggleButton } from '@/shared/ui'
import { cn } from '@/shared/lib'
import { prefersSmallTextures } from '@/shared/config'
import {
  cosmicAge,
  focus,
  intro,
  options,
  scale,
  selection,
  viewActions,
} from '../../model/view'
import { objectsOf } from '../../model/objects'
import { currentWorld } from '../../model/world/store'
import { setCollisionInfo } from '../../model/local/collisionInfo'
import { forwardable } from '../scene/protocol'
import type { Viewport as ViewportSize } from '../scene/protocol'
import { pick, t } from '../i18n'
import type { MessageKey } from '../i18n'
import {
  canUseWorker,
  createMainClient,
  createWorkerClient,
} from './renderClient'
import type { RenderCallbacks, RenderClient } from './renderClient'
import { placeLabels } from './labels'
import styles from './Viewport.module.css'

const STEP = Math.PI / 12
const MOTION_QUERY = '(prefers-reduced-motion: reduce)'
/** 이만큼 덜 움직이고 손을 떼면 끌기가 아니라 고르기 (CSS 픽셀) */
const CLICK_SLOP = 6
/** 워커가 이 시간 안에 첫 장면을 그리지 못하면 메인 스레드로 바꿈 (OffscreenCanvas가 불안정한 브라우저) */
const WORKER_READY_TIMEOUT_MS = 20_000

type CameraAction = 'left' | 'right' | 'up' | 'down' | 'in' | 'out'

const ACTIONS: Record<CameraAction, (client: RenderClient) => void> = {
  left: (c) => c.rotate(-STEP, 0),
  right: (c) => c.rotate(STEP, 0),
  up: (c) => c.rotate(0, -STEP),
  down: (c) => c.rotate(0, STEP),
  in: (c) => c.zoom(0.8),
  out: (c) => c.zoom(1.25),
}

const KEYS: Record<string, CameraAction> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  '+': 'in',
  '=': 'in',
  '-': 'out',
}

const BUTTONS: Array<{
  action: CameraAction
  label: MessageKey
  symbol: string
}> = [
  { action: 'left', label: 'viewport.left', symbol: '←' },
  { action: 'right', label: 'viewport.right', symbol: '→' },
  { action: 'up', label: 'viewport.up', symbol: '↑' },
  { action: 'down', label: 'viewport.down', symbol: '↓' },
  { action: 'in', label: 'viewport.in', symbol: '+' },
  { action: 'out', label: 'viewport.out', symbol: '−' },
]

/** 첫 화면을 그리고 글꼴을 받은 뒤의 유휴 시간 (메인 스레드에서 그릴 때) */
const afterPaint = () =>
  new Promise<void>((resolve) => {
    const idle = () =>
      'requestIdleCallback' in window
        ? window.requestIdleCallback(() => resolve(), { timeout: 1500 })
        : setTimeout(resolve, 200)
    document.fonts.ready.then(() =>
      requestAnimationFrame(() => requestAnimationFrame(idle)),
    )
  })

/** 끌어서 돌리고 확대하는 3D 우주 장면 */
export function Viewport(props: { hintId: string; controls: boolean }) {
  let container!: HTMLDivElement
  let client: RenderClient | null = null
  const [status, setStatus] = createSignal<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const [reduced, setReduced] = createSignal(false)
  const [moreOpen, setMoreOpen] = createSignal(false)
  const optionsId = createUniqueId()
  const labels = new Map<string, HTMLElement>()

  onMount(() => {
    const query = window.matchMedia(MOTION_QUERY)
    setReduced(query.matches)
    const onMotion = () => setReduced(query.matches)
    query.addEventListener('change', onMotion)
    onCleanup(() => query.removeEventListener('change', onMotion))

    let disposed = false
    let frame = 0
    /** 마지막으로 엔진에 넘긴 화면 상태 (바뀌었는지 비교) */
    let lastSent: unknown[] = []
    const smallTextures = prefersSmallTextures()
    const measure = (): ViewportSize => {
      const rect = container.getBoundingClientRect()
      return {
        width: container.clientWidth,
        height: container.clientHeight,
        pixelRatio: Math.min(window.devicePixelRatio, 1.75),
        rect: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        },
      }
    }

    // 캔버스: 워커로 넘기면 메인 스레드에서는 다시 쓸 수 없으므로 바꿀 때 새로 만듦
    const pointers = new Map<number, [number, number]>()
    /** 두 손가락 이상으로 확대·회전한 제스처 (손을 모두 뗄 때까지 고르지 않음) */
    let multiPointer = false
    const createCanvas = () => {
      const canvas = document.createElement('canvas')
      canvas.setAttribute('aria-hidden', 'true')
      canvas.className = styles.surface
      const forward = (event: PointerEvent | WheelEvent) => {
        if (client?.mode === 'worker') client.forward(forwardable(event))
      }
      canvas.addEventListener('pointerdown', (event) => {
        pointers.set(event.pointerId, [event.clientX, event.clientY])
        if (pointers.size > 1) multiPointer = true
        if (client?.mode === 'worker') {
          // 캔버스 밖으로 끌어도 계속 받도록 (워커의 대리 요소는 캡처를 못 함)
          canvas.setPointerCapture(event.pointerId)
          canvas.style.cursor = 'grabbing'
        }
        forward(event)
      })
      canvas.addEventListener('pointermove', (event) => {
        if (pointers.has(event.pointerId)) forward(event)
      })
      const release = (event: PointerEvent) => {
        const start = pointers.get(event.pointerId)
        if (!start) return
        pointers.delete(event.pointerId)
        forward(event)
        const gesture = multiPointer
        if (pointers.size === 0) {
          multiPointer = false
          if (client?.mode === 'worker') canvas.style.cursor = ''
        }
        // 한 손가락(마우스)으로 거의 움직이지 않고 떼면 그 자리의 천체를 고름
        if (
          gesture ||
          event.type !== 'pointerup' ||
          Math.hypot(event.clientX - start[0], event.clientY - start[1]) >
            CLICK_SLOP
        )
          return
        const rect = canvas.getBoundingClientRect()
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1
        // 워커의 답이 오기 전에 규모를 바꿨으면 이전 규모의 천체이므로 버림
        const requested = scale()
        void client?.pick(x, y).then((id) => {
          if (id && scale() === requested) viewActions.select(id)
        })
      }
      canvas.addEventListener('pointerup', release)
      canvas.addEventListener('pointercancel', release)
      canvas.addEventListener(
        'wheel',
        (event) => {
          if (client?.mode !== 'worker') return
          // 워커에서는 기본 동작(페이지 스크롤)을 막을 수 없으므로 여기서
          event.preventDefault()
          forward(event)
        },
        { passive: false },
      )
      canvas.addEventListener('contextmenu', (event) => event.preventDefault())
      container.append(canvas)
      return canvas
    }
    let canvas = createCanvas()

    const callbacks: RenderCallbacks = {
      onLabels: (positions) => placeLabels(labels, positions),
      onCollision: setCollisionInfo,
      onReady: () => setStatus('ready'),
      onError: () => {
        // 워커에서 WebGL을 못 열면(오래된 브라우저 등) 메인 스레드로 다시 시도
        if (client?.mode === 'worker' && status() !== 'ready') void startMain()
        else setStatus('error')
      },
    }

    const startMain = async () => {
      client?.dispose()
      client = null
      lastSent = []
      canvas.remove()
      canvas = createCanvas()
      // 메인 스레드에서 그릴 때는 첫 화면을 그린 뒤 유휴 시간에 무거운 장면을 만듦
      await afterPaint()
      if (disposed) return
      try {
        const created = await createMainClient(
          canvas,
          measure(),
          smallTextures,
          { ...callbacks, onError: () => setStatus('error') },
        )
        // 엔진 묶음을 받는 사이에 화면을 떠났으면 바로 정리
        if (disposed) created.dispose()
        else client = created
      } catch {
        setStatus('error')
      }
    }

    if (canUseWorker(canvas)) {
      try {
        client = createWorkerClient(canvas, measure(), smallTextures, callbacks)
      } catch {
        void startMain()
      }
    } else void startMain()
    const watchdog = setTimeout(() => {
      if (client?.mode === 'worker' && status() === 'loading') void startMain()
    }, WORKER_READY_TIMEOUT_MS)
    onCleanup(() => clearTimeout(watchdog))

    const observer = new ResizeObserver(() => client?.resize(measure()))
    observer.observe(container)

    // 워커의 OrbitControls는 Ctrl 키를 눌렀는지로 휠과 트랙패드 핀치를 구분하므로 알려 줌
    const forwardControl = (event: KeyboardEvent) => {
      if (event.key === 'Control' && client?.mode === 'worker')
        client.forward({ type: event.type, key: event.key })
    }
    window.addEventListener('keydown', forwardControl, true)
    window.addEventListener('keyup', forwardControl, true)
    onCleanup(() => {
      window.removeEventListener('keydown', forwardControl, true)
      window.removeEventListener('keyup', forwardControl, true)
    })

    // 화면 상태가 바뀐 프레임에만 엔진에 넘김 (시뮬레이션 상태는 사건 기록을 빼고)
    const push = () => {
      frame = requestAnimationFrame(push)
      if (!client) return
      const world = currentWorld()
      const labelIds = [...labels.keys()]
      const parts = [
        world,
        scale(),
        selection(),
        focus(),
        options(),
        intro(),
        cosmicAge(),
        reduced(),
        labelIds.join('|'),
      ]
      if (parts.every((part, i) => part === lastSent[i])) return
      lastSent = parts
      client.setState({
        world: { ...world, events: [] },
        scale: scale(),
        selection: selection(),
        focus: focus(),
        options: options(),
        intro: intro(),
        cosmicAge: cosmicAge(),
        reducedMotion: reduced(),
        labelIds,
      })
    }
    frame = requestAnimationFrame(push)

    onCleanup(() => {
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      client?.dispose()
      client = null
    })
  })

  const perform = (action: CameraAction) => {
    viewActions.setOption('autoRotate', false)
    if (client) ACTIONS[action](client)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    const action = KEYS[event.key]
    if (!action || event.target !== event.currentTarget) return
    event.preventDefault()
    perform(action)
  }

  const autoRotate = () => options().autoRotate ?? !reduced()

  return (
    <div class={styles.viewport}>
      <div
        ref={container}
        role="group"
        aria-roledescription={t('viewport.role')}
        aria-label={t('viewport.area')}
        aria-describedby={props.hintId}
        tabIndex={0}
        onKeyDown={onKeyDown}
        class={styles.canvas}
      />
      <div class={styles.labels} aria-hidden="true">
        <Show when={options().labels}>
          <For each={objectsOf(scale())}>
            {(item) => {
              onCleanup(() => labels.delete(item.id))
              return (
                <span
                  ref={(el) => labels.set(item.id, el)}
                  class={cn(
                    styles.label,
                    selection()[scale()] === item.id && styles.selected,
                  )}
                >
                  {pick(item.name)}
                </span>
              )
            }}
          </For>
        </Show>
      </div>
      <p
        role="status"
        class={cn(styles.status, status() === 'ready' && styles.hidden)}
      >
        {status() === 'error'
          ? t('viewport.noWebgl')
          : status() === 'loading'
            ? t('viewport.loading')
            : ''}
      </p>
      <div class={cn(styles.controls, !props.controls && styles.hidden)}>
        <div class={styles.bar}>
          <For each={BUTTONS}>
            {(button) => (
              <Button
                size="sm"
                class={styles.icon}
                aria-label={t(button.label)}
                onClick={() => perform(button.action)}
              >
                {button.symbol}
              </Button>
            )}
          </For>
          <Button
            size="sm"
            onClick={() => viewActions.overview()}
            disabled={focus() === null}
          >
            {t('viewport.overview')}
          </Button>
          <button
            type="button"
            aria-expanded={moreOpen() ? 'true' : 'false'}
            aria-controls={optionsId}
            onClick={() => setMoreOpen((v) => !v)}
            class={styles.more}
          >
            {t('viewport.view')}
          </button>
          <div
            id={optionsId}
            class={cn(styles.options, moreOpen() && styles.open)}
          >
            <ToggleButton
              pressed={autoRotate()}
              onToggle={(v) => viewActions.setOption('autoRotate', v)}
            >
              {t('viewport.autoRotate')}
            </ToggleButton>
            <ToggleButton
              pressed={options().labels}
              onToggle={(v) => viewActions.setOption('labels', v)}
            >
              {t('viewport.labels')}
            </ToggleButton>
            <Show when={scale() === 'solar'}>
              <ToggleButton
                pressed={options().orbits}
                onToggle={(v) => viewActions.setOption('orbits', v)}
              >
                {t('viewport.orbits')}
              </ToggleButton>
              <ToggleButton
                pressed={options().habitableZone}
                onToggle={(v) => viewActions.setOption('habitableZone', v)}
              >
                {t('viewport.hz')}
              </ToggleButton>
              <ToggleButton
                pressed={options().distanceMode === 'linear'}
                onToggle={(v) =>
                  viewActions.setOption(
                    'distanceMode',
                    v ? 'linear' : 'compressed',
                  )
                }
              >
                {t('viewport.linear')}
              </ToggleButton>
              <ToggleButton
                pressed={options().meteorStreams}
                onToggle={(v) => viewActions.setOption('meteorStreams', v)}
              >
                {t('viewport.streams')}
              </ToggleButton>
            </Show>
          </div>
        </div>
      </div>
    </div>
  )
}
