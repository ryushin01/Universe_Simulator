import { For, Show } from 'solid-js'
import { locale } from '@/shared/i18n'
import { world } from '../../model/world/store'
import { formatSimDate } from '../../model/world/text'
import { pick, t } from '../i18n'
import type { MessageKey } from '../i18n'
import styles from './status.module.css'

const TAG: Record<string, MessageKey> = {
  info: 'log.info',
  warn: 'log.warn',
  danger: 'log.danger',
  good: 'log.good',
}

/** 사건 기록 (최근 것부터, 상태를 색과 글자로 함께 표시) */
export function EventLog() {
  return (
    <section aria-labelledby="log-title" class={styles.block}>
      <h3 id="log-title" class={styles.heading}>
        {t('log.title')}
      </h3>
      <Show
        when={world().events.length > 0}
        fallback={<p class={styles.small}>{t('log.empty')}</p>}
      >
        <ol class={styles.events}>
          <For each={world().events.slice(0, 40)}>
            {(event) => (
              <li class={`${styles.event} ${styles[`tone-${event.tone}`]}`}>
                <span class={styles.eventMeta}>
                  <span class={styles.tag}>{t(TAG[event.tone])}</span>
                  <span>{formatSimDate(event.year, locale())}</span>
                </span>
                <span>{pick(event.text)}</span>
              </li>
            )}
          </For>
        </ol>
      </Show>
    </section>
  )
}
