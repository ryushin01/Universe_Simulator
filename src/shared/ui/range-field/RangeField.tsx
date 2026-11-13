import { Show, createUniqueId } from 'solid-js'
import type { JSX } from 'solid-js'
import styles from './RangeField.module.css'

interface RangeFieldProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onInput: (value: number) => void
  /** 화면에 보이는 값 (예: "1일/초"). aria-valuetext로도 전달합니다 */
  valueText: string
  description?: JSX.Element
}

/** 레이블·현재 값·설명이 연결된 범위 입력 */
export function RangeField(props: RangeFieldProps) {
  const id = createUniqueId()
  const descId = `${id}-desc`
  return (
    <div class={styles.field}>
      <div class={styles.head}>
        <label for={id} class="label-caps">
          {props.label}
        </label>
        {/* 값은 aria-valuetext로 전달하므로 output(암묵적 status)을 쓰지 않음 */}
        <span aria-hidden="true" class={`num ${styles.value}`}>
          {props.valueText}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={props.value}
        aria-valuetext={props.valueText}
        aria-describedby={props.description ? descId : undefined}
        onInput={(event) => props.onInput(Number(event.currentTarget.value))}
        class={styles.input}
      />
      <Show when={props.description}>
        <p id={descId} class={styles.description}>
          {props.description}
        </p>
      </Show>
    </div>
  )
}
