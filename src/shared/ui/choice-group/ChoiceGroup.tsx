import { For, Show, createUniqueId } from 'solid-js'
import { cn } from '@/shared/lib'
import styles from './ChoiceGroup.module.css'

export interface Choice<T extends string> {
  value: T
  label: string
  hint?: string
}

interface ChoiceGroupProps<T extends string> {
  legend: string
  value: T
  choices: Array<Choice<T>>
  onChange: (value: T) => void
  columns?: 1 | 2 | 3 | 4 | 5
  /** 범례를 화면에서 숨김 (접근 이름은 유지) */
  hideLegend?: boolean
}

/** fieldset + 라디오 버튼 묶음 (화살표 키 이동은 브라우저 기본 동작) */
export function ChoiceGroup<T extends string>(props: ChoiceGroupProps<T>) {
  const name = createUniqueId()
  return (
    <fieldset class={styles.fieldset}>
      <legend
        class={cn('label-caps', styles.legend, props.hideLegend && 'sr-only')}
      >
        {props.legend}
      </legend>
      <div
        class={styles.grid}
        style={{
          'grid-template-columns': `repeat(${props.columns ?? 2}, minmax(0, 1fr))`,
        }}
      >
        <For each={props.choices}>
          {(choice) => {
            const checked = () => choice.value === props.value
            return (
              <label class={cn(styles.choice, checked() && styles.checked)}>
                <input
                  type="radio"
                  name={name}
                  value={choice.value}
                  checked={checked()}
                  onChange={() => props.onChange(choice.value)}
                  class="sr-only"
                />
                <span class={styles.label}>{choice.label}</span>
                <Show when={choice.hint}>
                  <span class={styles.hint}>{choice.hint}</span>
                </Show>
              </label>
            )
          }}
        </For>
      </div>
    </fieldset>
  )
}
