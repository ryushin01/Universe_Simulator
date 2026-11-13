import { Show } from 'solid-js'
import { locale } from '@/shared/i18n'
import { Button, RangeField } from '@/shared/ui'
import { cn, formatYears } from '@/shared/lib'
import { world, worldActions } from '../../model/world/store'
import { SPEEDS, isOrbitFrozen } from '../../model/world/time'
import { sunAgeGyr } from '../../model/solar/sun'
import { formatSimDate } from '../../model/world/text'
import { pick, t } from '../i18n'
import styles from './status.module.css'

/** 재생·멈춤, 날짜, 시간 속도 */
export function TimeControls() {
  const running = () => world().running
  const speed = () => world().speedIndex
  const note = () =>
    world().nbody
      ? t('time.nbody')
      : isOrbitFrozen(speed())
        ? t('time.frozen')
        : t('time.moving')
  return (
    <section aria-labelledby="time-title" class={styles.block}>
      <h3 id="time-title" class={styles.heading}>
        {t('time.title')}
      </h3>
      <div class={styles.row}>
        <button
          type="button"
          class={cn(styles.ringButton, running() && styles.playing)}
          onClick={() => worldActions.setRunning(!running())}
          disabled={
            world().mission?.status !== undefined &&
            world().mission?.status !== 'running'
          }
        >
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
            <Show
              when={running()}
              fallback={<path d="M6 3.5v13l11-6.5z" fill="currentColor" />}
            >
              <path
                d="M5 3.5h3.5v13H5zM11.5 3.5H15v13h-3.5z"
                fill="currentColor"
              />
            </Show>
          </svg>
          <span class="sr-only">
            {running() ? t('time.pause') : t('time.play')}
          </span>
        </button>
        <p class={styles.date}>
          <span class="label-caps">{t('time.date')}</span>
          <span class={styles.dateValue}>
            {formatSimDate(world().year, locale(), speed() <= 1)}
          </span>
          <span class={styles.small}>
            {t('time.sunAge', {
              age: formatYears(
                Number((sunAgeGyr(world().year) * 1e9).toPrecision(4)),
                locale(),
              ),
            })}
          </span>
        </p>
      </div>
      <RangeField
        label={t('time.speed')}
        min={0}
        max={SPEEDS.length - 1}
        value={speed()}
        valueText={pick(SPEEDS[speed()].label)}
        onInput={(value) => worldActions.setSpeed(value)}
        description={note()}
      />
      <div class={styles.actions}>
        <Button
          size="sm"
          onClick={() => worldActions.reset()}
          disabled={world().mission?.status === 'running'}
        >
          {t('time.reset')}
        </Button>
      </div>
    </section>
  )
}
