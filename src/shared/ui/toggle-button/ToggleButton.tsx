import type { JSX } from 'solid-js'
import { cn } from '@/shared/lib'
import styles from './ToggleButton.module.css'

interface ToggleButtonProps {
  pressed: boolean
  onToggle: (next: boolean) => void
  children: JSX.Element
  class?: string
}

/** 켜고 끄는 버튼 (aria-pressed). 글자는 바뀌지 않습니다 */
export function ToggleButton(props: ToggleButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={props.pressed ? 'true' : 'false'}
      onClick={() => props.onToggle(!props.pressed)}
      class={cn(styles.toggle, props.pressed && styles.on, props.class)}
    >
      <span aria-hidden="true" class={styles.dot} />
      {props.children}
    </button>
  )
}
