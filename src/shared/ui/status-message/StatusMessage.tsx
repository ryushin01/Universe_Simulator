import { cn } from '@/shared/lib'
import styles from './StatusMessage.module.css'

interface StatusMessageProps {
  message: string
  tone?: 'info' | 'error'
  class?: string
}

/** 결과를 알리는 상태 영역. 내용만 바뀌도록 항상 DOM에 둡니다 */
export function StatusMessage(props: StatusMessageProps) {
  return (
    <p
      role="status"
      class={cn(
        styles.message,
        props.tone === 'error' && styles.error,
        props.class,
      )}
    >
      {props.message}
    </p>
  )
}
