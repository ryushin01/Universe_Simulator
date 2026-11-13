import { For, Show } from 'solid-js'
import type { JSX } from 'solid-js'
import styles from './PassportCard.module.css'

export interface PassportField {
  label: string
  value: string
}

interface PassportCardProps {
  title: string
  subtitle: string
  /** 가운데 원의 배경 (CSS background) */
  image: string
  /** 원을 도는 진행 고리 (0~1), 없으면 null */
  ring: number | null
  ringLabel?: string
  /** 원 위의 작은 배지 (예: 탐사 단계) */
  badge?: string
  badgeLabel?: string
  fields: PassportField[]
  /** 천체가 도는 모습 (텍스처를 옆으로 흘림) */
  spin?: boolean
  children?: JSX.Element
}

/** 왼쪽 3개, 오른쪽 3개 항목의 세로 위치 (%) */
const ROWS = [10, 42, 74]

/** Space Advisor의 Space Passport처럼 가운데 원과 둘레 항목을 선으로 잇는 카드 */
export function PassportCard(props: PassportCardProps) {
  const left = () => props.fields.slice(0, 3)
  const right = () => props.fields.slice(3, 6)
  const ringLength = 2 * Math.PI * 46
  return (
    <div class={styles.card}>
      <p class={styles.title}>{props.title}</p>
      <p class={styles.subtitle}>{props.subtitle}</p>
      <div class={styles.passport}>
        <svg
          class={styles.lines}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <For each={left()}>
            {(_, i) => (
              <line
                x1="31"
                y1={ROWS[i()] + 5}
                x2="38"
                y2={42 + (ROWS[i()] - 42) * 0.35 + 6}
              />
            )}
          </For>
          <For each={right()}>
            {(_, i) => (
              <line
                x1="69"
                y1={ROWS[i()] + 5}
                x2="62"
                y2={42 + (ROWS[i()] - 42) * 0.35 + 6}
              />
            )}
          </For>
        </svg>
        <div class={styles.center}>
          <div
            class={styles.planet}
            classList={{ [styles.spin]: Boolean(props.spin) }}
            style={{ background: props.image }}
          />
          <svg class={styles.ring} viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="46" class={styles.track} />
            <Show when={props.ring !== null}>
              <circle
                cx="50"
                cy="50"
                r="46"
                class={styles.progress}
                stroke-dasharray={`${(props.ring ?? 0) * ringLength} ${ringLength}`}
                transform="rotate(-90 50 50)"
              />
            </Show>
          </svg>
          <Show when={props.badge}>
            <span class={styles.badge} aria-hidden="true">
              {props.badge}
            </span>
          </Show>
        </div>
        <dl class={styles.fields}>
          <For each={left()}>
            {(field, i) => (
              <div
                class={styles.field}
                style={{ '--row': `${ROWS[i()]}%` }}
                data-side="left"
              >
                <dt>{field.label}</dt>
                <dd>{field.value}</dd>
              </div>
            )}
          </For>
          <For each={right()}>
            {(field, i) => (
              <div
                class={styles.field}
                style={{ '--row': `${ROWS[i()]}%` }}
                data-side="right"
              >
                <dt>{field.label}</dt>
                <dd>{field.value}</dd>
              </div>
            )}
          </For>
        </dl>
      </div>
      <Show when={props.ringLabel || props.badgeLabel}>
        <p class={styles.meta}>
          <Show when={props.badgeLabel}>
            <span>{props.badgeLabel}</span>
          </Show>
          <Show when={props.ringLabel}>
            <span>{props.ringLabel}</span>
          </Show>
        </p>
      </Show>
      {props.children}
    </div>
  )
}
