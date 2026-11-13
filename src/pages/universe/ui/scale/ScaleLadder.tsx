import { For, createUniqueId } from 'solid-js'
import { cn } from '@/shared/lib'
import { SCALES, scale, viewActions } from '../../model/view'
import type { ScaleId } from '../../model/view'
import { t } from '../i18n'
import type { MessageKey } from '../i18n'
import styles from './ScaleLadder.module.css'

/** 규모마다 대표 길이 (10의 거듭제곱 사다리) */
const SPAN: Record<ScaleId, string> = {
  solar: '10⁰ AU',
  stars: '10³ ly',
  galaxy: '10⁵ ly',
  local: '10⁶ ly',
  cosmic: '10¹⁰ ly',
}

/** 태양계 → 이웃 별 → 우리 은하 → 국부 은하군 → 우주 거대 구조 */
export function ScaleLadder() {
  const name = createUniqueId()
  return (
    <fieldset class={styles.ladder}>
      <legend class="sr-only">{t('scale.legend')}</legend>
      <For each={SCALES}>
        {(id) => (
          <label class={cn(styles.step, scale() === id && styles.on)}>
            <input
              type="radio"
              name={name}
              value={id}
              checked={scale() === id}
              onChange={() => viewActions.setScale(id)}
              class="sr-only"
            />
            <span class={styles.name}>{t(`scale.${id}` as MessageKey)}</span>
            <span class={styles.span} aria-hidden="true">
              {SPAN[id]}
            </span>
          </label>
        )}
      </For>
    </fieldset>
  )
}
