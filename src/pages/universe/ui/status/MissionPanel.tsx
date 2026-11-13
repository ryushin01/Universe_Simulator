import { For, Show, createEffect } from 'solid-js'
import { locale } from '@/shared/i18n'
import { Button, StatusMessage } from '@/shared/ui'
import { formatMoney } from '@/shared/lib'
import { MISSIONS, MISSION_BY_ID } from '../../model/world/missions'
import type { MissionId } from '../../model/world/types'
import { world, worldActions } from '../../model/world/store'
import { formatDuration } from '../../model/world/text'
import { createMessage, pick, t } from '../i18n'
import styles from './status.module.css'

/** 미션 고르기·진행 상황·결과 대화상자 */
export function MissionPanel() {
  const [message, setMessage] = createMessage()
  let dialog: HTMLDialogElement | undefined
  let opener: HTMLElement | null = null
  const mission = () => world().mission

  // 미션이 끝나면 결과 대화상자를 엶
  createEffect(() => {
    const m = mission()
    if (m && m.status !== 'running' && dialog && !dialog.open) {
      opener = document.activeElement as HTMLElement | null
      dialog.showModal()
    }
  })

  const start = (id: MissionId) => {
    const result = worldActions.startMission(id)
    setMessage(() => pick(result.message))
  }

  const close = () => {
    dialog?.close()
    opener?.focus()
  }

  return (
    <section aria-labelledby="mission-title" class={styles.block}>
      <h3 id="mission-title" class={styles.heading}>
        {t('mission.title')}
      </h3>
      <Show
        when={mission()}
        fallback={
          <ul class={styles.missions}>
            <For each={MISSIONS}>
              {(spec) => (
                <li>
                  <p class={styles.missionName}>{pick(spec.name)}</p>
                  <p class={styles.small}>{pick(spec.brief)}</p>
                  <Button
                    size="sm"
                    variant="primary"
                    chevron
                    onClick={() => start(spec.id)}
                  >
                    {t('mission.start')}
                  </Button>
                </li>
              )}
            </For>
          </ul>
        }
      >
        {(m) => {
          const spec = () => MISSION_BY_ID[m().id]
          return (
            <div class={styles.block}>
              <p class={styles.missionName}>{pick(spec().name)}</p>
              <p class={styles.small}>{pick(spec().goal)}</p>
              <dl class={styles.list}>
                <dt>{t('mission.left')}</dt>
                <dd>
                  {formatDuration(
                    Math.max(0, m().endYear - world().year),
                    locale(),
                  )}
                </dd>
                <dt>{t('status.budget')}</dt>
                <dd>{formatMoney(world().budget, locale())}</dd>
                <Show when={m().id === 'solar-max'}>
                  <dt>{t('status.losses')}</dt>
                  <dd>
                    {formatMoney(world().losses - m().startLosses, locale())} /
                    $500B
                  </dd>
                </Show>
                <dt>{t('mission.state')}</dt>
                <dd
                  class={
                    m().status === 'won'
                      ? styles.good
                      : m().status === 'lost'
                        ? styles.danger
                        : ''
                  }
                >
                  {t(`mission.${m().status}`)}
                </dd>
              </dl>
              <div class={styles.actions}>
                <Button
                  size="sm"
                  onClick={() => {
                    const result = worldActions.quitMission()
                    setMessage(() => pick(result.message))
                  }}
                >
                  {t('mission.quit')}
                </Button>
              </div>
            </div>
          )
        }}
      </Show>
      <StatusMessage message={message()} />
      <dialog
        ref={dialog}
        class={styles.dialog}
        aria-labelledby="mission-result-title"
        aria-describedby="mission-result-text"
        onClose={() => opener?.focus()}
      >
        <h2 id="mission-result-title" class={styles.dialogTitle}>
          {mission()?.status === 'won'
            ? t('mission.wonTitle')
            : t('mission.lostTitle')}
        </h2>
        <p id="mission-result-text">
          {mission()?.result ? pick(mission()!.result!) : ''}
        </p>
        <div class={styles.actions}>
          <Button
            variant="primary"
            onClick={() => {
              close()
              worldActions.quitMission()
            }}
          >
            {t('mission.close')}
          </Button>
          <Show when={mission()}>
            <Button
              onClick={() => {
                close()
                start(mission()!.id)
              }}
            >
              {t('mission.retry')}
            </Button>
          </Show>
        </div>
      </dialog>
    </section>
  )
}
