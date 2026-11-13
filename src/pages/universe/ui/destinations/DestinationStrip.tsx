import { For, Show, createUniqueId } from 'solid-js'
import { cn } from '@/shared/lib'
import { scale, selection, viewActions } from '../../model/view'
import { destinationsOf } from '../../model/objects'
import { isRemoved } from '../../model/world/selectors'
import { world } from '../../model/world/store'
import { isBodyId } from '../../model/solar/bodies'
import { pick, t } from '../i18n'
import type { MessageKey } from '../i18n'
import styles from './DestinationStrip.module.css'

/** Space Advisor의 ‘SELECT A DESTINATION’: 지금 규모의 주요 대상 */
export function DestinationStrip() {
  const name = createUniqueId()
  const gone = (id: string) =>
    scale() === 'solar' && isBodyId(id) && isRemoved(world(), id)
  return (
    <fieldset class={styles.strip} aria-describedby={`${name}-hint`}>
      <legend class={styles.legend}>
        {t(`scale.${scale()}` as MessageKey)}
      </legend>
      <p id={`${name}-hint`} class={styles.hint}>
        {t(`scale.${scale()}Hint` as MessageKey)}
      </p>
      <div class={styles.items}>
        <For each={destinationsOf(scale())}>
          {(item) => (
            <label
              class={cn(
                styles.item,
                selection()[scale()] === item.id && styles.on,
                gone(item.id) && styles.gone,
              )}
            >
              <input
                type="radio"
                name={name}
                value={item.id}
                checked={selection()[scale()] === item.id}
                onChange={() => viewActions.select(item.id)}
                class="sr-only"
              />
              {pick(item.name)}
              <Show when={gone(item.id)}>
                <span class="sr-only"> ({t('status.gone')})</span>
              </Show>
            </label>
          )}
        </For>
      </div>
    </fieldset>
  )
}
