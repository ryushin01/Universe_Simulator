import { splitProps } from 'solid-js'
import type { JSX } from 'solid-js'
import { cn } from '@/shared/lib'
import styles from './Button.module.css'

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
  size?: 'md' | 'sm'
  /** 끝에 » 표시 (다음 단계로 넘어가는 버튼) */
  chevron?: boolean
}

/** 자간을 넓힌 대문자 라벨의 각진 버튼 (기본 type="button") */
export function Button(props: ButtonProps) {
  const [local, rest] = splitProps(props, [
    'variant',
    'size',
    'chevron',
    'class',
    'children',
    'type',
  ])
  return (
    <button
      type={local.type ?? 'button'}
      class={cn(
        styles.button,
        styles[local.variant ?? 'ghost'],
        local.size === 'sm' && styles.sm,
        local.class,
      )}
      {...rest}
    >
      {local.children}
      {local.chevron ? (
        <span aria-hidden="true" class={styles.chevron}>
          »
        </span>
      ) : null}
    </button>
  )
}
