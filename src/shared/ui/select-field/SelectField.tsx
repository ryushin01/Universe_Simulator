import { For, Show, createUniqueId } from 'solid-js'
import styles from './SelectField.module.css'

export interface SelectOption {
  value: string
  label: string
  group?: string
  disabled?: boolean
}

interface SelectFieldProps {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  description?: string
}

/** 네이티브 select (그룹이 있으면 optgroup으로 묶음) */
export function SelectField(props: SelectFieldProps) {
  const id = createUniqueId()
  const groups = () => [...new Set(props.options.map((o) => o.group ?? ''))]
  const optionsOf = (group: string) =>
    props.options.filter((o) => (o.group ?? '') === group)
  return (
    <div class={styles.field}>
      <label for={id} class="label-caps">
        {props.label}
      </label>
      <select
        id={id}
        value={props.value}
        onChange={(event) => props.onChange(event.currentTarget.value)}
        aria-describedby={props.description ? `${id}-desc` : undefined}
        class={styles.select}
      >
        <For each={groups()}>
          {(group) => (
            <Show
              when={group}
              fallback={
                <For each={optionsOf('')}>
                  {(o) => (
                    <option
                      value={o.value}
                      disabled={o.disabled}
                      selected={o.value === props.value}
                    >
                      {o.label}
                    </option>
                  )}
                </For>
              }
            >
              <optgroup label={group}>
                <For each={optionsOf(group)}>
                  {(o) => (
                    <option
                      value={o.value}
                      disabled={o.disabled}
                      selected={o.value === props.value}
                    >
                      {o.label}
                    </option>
                  )}
                </For>
              </optgroup>
            </Show>
          )}
        </For>
      </select>
      <Show when={props.description}>
        <p id={`${id}-desc`} class={styles.description}>
          {props.description}
        </p>
      </Show>
    </div>
  )
}
