import { For, Show, createEffect, onMount } from 'solid-js'
import { isServer } from 'solid-js/web'
import { LOCALES, locale, setLocale, syncLocale } from '@/shared/i18n'
import { Button } from '@/shared/ui'
import { cn } from '@/shared/lib'
import { REPOSITORY_URL } from '@/shared/config'
import { intro, viewActions } from '../model/view'
import { startAtNow } from '../model/world/store'
import { t } from './i18n'
import { useClock } from './useClock'
import { IntroRings } from './intro/IntroRings'
import { Viewport } from './viewport/Viewport'
import { ScaleLadder } from './scale/ScaleLadder'
import { DestinationStrip } from './destinations/DestinationStrip'
import { ControlPanel } from './panels/ControlPanel'
import { TimeControls } from './status/TimeControls'
import { Dossier } from './status/Dossier'
import { MissionPanel } from './status/MissionPanel'
import { StatusBoard } from './status/StatusBoard'
import { EventLog } from './status/EventLog'
import { ScenarioShare, openSharedScenario } from './status/ScenarioShare'
import styles from './UniversePage.module.css'

function LanguageSwitch() {
  return (
    <div role="group" aria-label={t('page.language')} class={styles.languages}>
      <For each={LOCALES}>
        {(value) => (
          <button
            type="button"
            lang={value}
            aria-pressed={locale() === value ? 'true' : 'false'}
            onClick={() => setLocale(value)}
            class={cn(styles.language, locale() === value && styles.languageOn)}
          >
            {value === 'ko' ? '한국어' : 'English'}
          </button>
        )}
      </For>
    </div>
  )
}

const MOBILE_LINKS = [
  { href: '#stage', label: 'page.viewport' },
  { href: '#controls', label: 'page.controls' },
  { href: '#status', label: 'page.status' },
] as const

export function UniversePage() {
  useClock()
  onMount(() => {
    syncLocale()
    startAtNow()
    // 공유 링크로 열면 소개 화면 없이 바로 그 장면으로
    if (openSharedScenario()) viewActions.closeIntro()
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      const base = import.meta.env.BASE_URL
      navigator.serviceWorker
        .register(`${base}sw.js`, { scope: base })
        .catch(() => {})
    }
  })
  createEffect(() => {
    if (!isServer) document.title = `UNIVERSE SIMULATOR · ${t('page.tagline')}`
  })

  const inertDuringIntro = () => (intro() ? true : undefined)

  const start = () => {
    viewActions.closeIntro()
    // 소개가 사라진 뒤 우주 관리 패널로 초점을 옮김
    queueMicrotask(() =>
      document.getElementById('controls')?.focus({ preventScroll: true }),
    )
  }

  return (
    <div class={cn(styles.page, intro() && styles.introOn)}>
      <Show when={!intro()}>
        <a href="#controls" class={styles.skip}>
          {t('page.skip')}
        </a>
      </Show>
      <header class={styles.header}>
        <div class={styles.brand}>
          <h1 class={styles.title}>Universe Simulator</h1>
          <p class={styles.tagline}>{t('page.tagline')}</p>
          <Show when={intro()}>
            <p class={styles.lead}>{t('page.lead')}</p>
            <Button
              variant="primary"
              chevron
              onClick={start}
              class={styles.start}
            >
              {t('page.start')}
            </Button>
          </Show>
        </div>
        <LanguageSwitch />
      </header>
      <Show when={intro()}>
        <IntroRings />
      </Show>

      {/* 소개 화면 동안 main 랜드마크는 남기고 안의 영역만 inert */}
      <main class={styles.main}>
        <section
          id="stage"
          aria-labelledby="stage-title"
          class={styles.stage}
          inert={inertDuringIntro()}
        >
          <h2 id="stage-title" class="sr-only">
            {t('page.viewport')}
          </h2>
          <Viewport hintId="viewport-hint" controls={!intro()} />
          <p id="viewport-hint" class={styles.hint}>
            {t('viewport.hint')}
          </p>
        </section>
        <div class={styles.ladder} inert={inertDuringIntro()}>
          <ScaleLadder />
        </div>
        <div class={styles.destinations} inert={inertDuringIntro()}>
          <DestinationStrip />
        </div>
        <div class={styles.panels} inert={inertDuringIntro()}>
          <section
            id="controls"
            tabIndex={-1}
            aria-labelledby="controls-title"
            class={cn(styles.panel, styles.left)}
          >
            <h2 id="controls-title" class={styles.panelTitle}>
              {t('page.controls')}
            </h2>
            <ControlPanel />
          </section>
          <section
            id="status"
            tabIndex={-1}
            aria-labelledby="status-title"
            class={cn(styles.panel, styles.right)}
          >
            <h2 id="status-title" class={styles.panelTitle}>
              {t('page.status')}
            </h2>
            <TimeControls />
            <Dossier />
            <MissionPanel />
            <StatusBoard />
            <EventLog />
            <ScenarioShare />
            {/* 외부 자료의 출처는 README에 밝히고, 화면에는 그곳으로 가는 링크만 둠 */}
            <p class={styles.credits}>
              <a href={`${REPOSITORY_URL}#출처`}>{t('page.credits')}</a>
            </p>
          </section>
        </div>
      </main>
      <nav
        aria-label={t('page.mobileNav')}
        class={styles.mobileNav}
        inert={inertDuringIntro()}
      >
        <ul>
          <For each={MOBILE_LINKS}>
            {(link) => (
              <li>
                <a href={link.href}>{t(link.label)}</a>
              </li>
            )}
          </For>
        </ul>
      </nav>
    </div>
  )
}
