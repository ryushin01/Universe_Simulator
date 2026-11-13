import { For, createUniqueId } from 'solid-js'
import type { JSX } from 'solid-js'
import { cn } from '@/shared/lib'
import styles from './Tabs.module.css'

export interface TabItem {
  id: string
  label: string
  content: JSX.Element
}

interface TabsProps {
  items: TabItem[]
  value: string
  onChange: (id: string) => void
  /** 탭 목록의 접근 이름 */
  label: string
  class?: string
  /** 한 줄에 놓을 탭 수 (넘치면 다음 줄로) */
  columns?: number
}

/** WAI-ARIA APG 탭 패턴 (자동 활성화, 화살표·Home·End 이동, roving tabindex) */
export function Tabs(props: TabsProps) {
  const baseId = createUniqueId()
  const tabRefs: HTMLButtonElement[] = []
  const tabId = (id: string) => `${baseId}-tab-${id}`
  const panelId = (id: string) => `${baseId}-panel-${id}`
  const columns = () =>
    props.columns ??
    (props.items.length > 4
      ? Math.ceil(props.items.length / 2)
      : props.items.length)

  const onKeyDown = (event: KeyboardEvent) => {
    const count = props.items.length
    const current = props.items.findIndex((item) => item.id === props.value)
    let next: number
    switch (event.key) {
      case 'ArrowRight':
        next = (current + 1) % count
        break
      case 'ArrowLeft':
        next = (current - 1 + count) % count
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = count - 1
        break
      default:
        return
    }
    event.preventDefault()
    props.onChange(props.items[next].id)
    tabRefs[next]?.focus()
  }

  return (
    <div class={props.class}>
      <div
        role="tablist"
        aria-label={props.label}
        onKeyDown={onKeyDown}
        class={styles.list}
        style={{
          'grid-template-columns': `repeat(${columns()}, minmax(0, 1fr))`,
        }}
      >
        <For each={props.items}>
          {(item, index) => {
            const selected = () => item.id === props.value
            return (
              <button
                ref={(el) => (tabRefs[index()] = el)}
                type="button"
                role="tab"
                id={tabId(item.id)}
                aria-selected={selected() ? 'true' : 'false'}
                aria-controls={panelId(item.id)}
                tabIndex={selected() ? 0 : -1}
                onClick={() => props.onChange(item.id)}
                class={cn(styles.tab, selected() && styles.selected)}
              >
                {item.label}
              </button>
            )
          }}
        </For>
      </div>
      <For each={props.items}>
        {(item) => (
          <div
            role="tabpanel"
            id={panelId(item.id)}
            aria-labelledby={tabId(item.id)}
            tabIndex={0}
            hidden={item.id !== props.value}
            class={styles.panel}
          >
            {item.content}
          </div>
        )}
      </For>
    </div>
  )
}
