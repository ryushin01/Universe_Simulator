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
import { focus, options, scale, selection, viewActions } from '../../model/view'
import { objectsOf } from '../../model/objects'
import { pick, t } from '../i18n'
import type { MessageKey } from '../i18n'
import type { Engine } from '../scene/Engine'
import styles from './Viewport.module.css'

const STEP = Math.PI / 12
const MOTION_QUERY = '(prefers-reduced-motion: reduce)'

type CameraAction = 'left' | 'right' | 'up' | 'down' | 'in' | 'out'

const ACTIONS: Record<CameraAction, (engine: Engine) => void> = {
  left: (e) => e.rotate(-STEP, 0),
  right: (e) => e.rotate(STEP, 0),
  up: (e) => e.rotate(0, -STEP),
  down: (e) => e.rotate(0, STEP),
  in: (e) => e.zoom(0.8),
  out: (e) => e.zoom(1.25),
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

/** 끌어서 돌리고 확대하는 3D 우주 장면 */
export function Viewport(props: { hintId: string; controls: boolean }) {
  let container!: HTMLDivElement
  let engine: Engine | undefined
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
    let cancelled = false
    // three.js 묶음은 바로 받기 시작하고, 무거운 장면 생성은 첫 화면이 그려진 뒤 유휴 시간에
    const module = import('../scene/Engine')
    const afterPaint = new Promise<void>((resolve) => {
      const idle = () =>
        'requestIdleCallback' in window
          ? window.requestIdleCallback(() => resolve(), { timeout: 1500 })
          : setTimeout(resolve, 200)
      document.fonts.ready.then(() =>
        requestAnimationFrame(() => requestAnimationFrame(idle)),
      )
    })
    Promise.all([module, afterPaint])
      .then(([{ createEngine }]) => {
        if (cancelled) return
        engine = createEngine({
          container,
          onPick: (id) => viewActions.select(id),
          reducedMotion: reduced,
          onError: () => setStatus('error'),
        })
        engine.setLabels(labels)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
    onCleanup(() => {
      cancelled = true
      engine?.dispose()
    })
  })

  const perform = (action: CameraAction) => {
    viewActions.setOption('autoRotate', false)
    if (engine) ACTIONS[action](engine)
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
