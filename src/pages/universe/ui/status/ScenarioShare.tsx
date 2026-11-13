import { For, Show, createSignal, onMount } from 'solid-js'
import { locale } from '@/shared/i18n'
import { Button, StatusMessage } from '@/shared/ui'
import { world, worldActions } from '../../model/world/store'
import {
  MAX_SAVES,
  SAVE_KEY,
  SHARE_PARAM,
  decodeSnapshot,
  encodeSnapshot,
  fromSnapshot,
  toSnapshot,
  validateSnapshot,
} from '../../model/world/snapshot'
import type { Snapshot } from '../../model/world/snapshot'
import { hasPendingEvents } from '../../model/world/selectors'
import { formatSimDate } from '../../model/world/text'
import { createMessage, t } from '../i18n'
import styles from './status.module.css'

interface Saved {
  name: string
  savedAt: number
  snapshot: Snapshot
}

function readSaves(): Saved[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(SAVE_KEY) ?? '[]')
    if (!Array.isArray(raw)) return []
    return raw
      .filter(
        (s) => s && typeof s.name === 'string' && typeof s.savedAt === 'number',
      )
      .map((s) => ({ ...s, snapshot: validateSnapshot(s.snapshot) }))
      .filter((s): s is Saved => s.snapshot !== null)
      .slice(0, MAX_SAVES)
  } catch {
    return []
  }
}

/** 주소의 ?s= 시나리오를 불러옵니다 (불러오면 true) */
export function openSharedScenario(): boolean {
  const code = new URLSearchParams(window.location.search).get(SHARE_PARAM)
  if (!code) return false
  const snapshot = decodeSnapshot(code)
  if (!snapshot) return false
  worldActions.replace(fromSnapshot(snapshot))
  return true
}

/** 공유 링크 복사와 브라우저 저장 */
export function ScenarioShare() {
  const [message, setMessage] = createMessage()
  const [saves, setSaves] = createSignal<Saved[]>([])
  const [name, setName] = createSignal('')
  onMount(() => setSaves(readSaves()))
  // 진행 중인 사건은 저장 형식에 담지 못하므로 끝난 뒤에 저장·공유
  const blocked = () => hasPendingEvents(world())
  const blockedHint = () => (blocked() ? 'share-blocked' : undefined)

  const share = async () => {
    if (blocked()) return
    const url = new URL(window.location.href)
    url.search = ''
    url.hash = ''
    url.searchParams.set(SHARE_PARAM, encodeSnapshot(toSnapshot(world())))
    try {
      await navigator.clipboard.writeText(url.toString())
      setMessage(() => t('share.copied'))
    } catch {
      window.history.replaceState(null, '', url)
      setMessage(() => t('share.inAddress'))
    }
  }

  const save = (event: SubmitEvent) => {
    event.preventDefault()
    if (blocked()) return
    const label = name().trim() || formatSimDate(world().year, locale())
    const next = [
      {
        name: label.slice(0, 40),
        savedAt: Date.now(),
        snapshot: toSnapshot(world()),
      },
      ...saves(),
    ].slice(0, MAX_SAVES)
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(next))
      setSaves(next)
      setName('')
      setMessage(() => t('share.saved', { name: label }))
    } catch {
      setMessage(() => t('share.saveFailed'))
    }
  }

  const load = (saved: Saved) => {
    worldActions.replace(fromSnapshot(saved.snapshot))
    setMessage(() => t('share.loaded', { name: saved.name }))
  }

  const remove = (saved: Saved) => {
    const next = saves().filter((s) => s !== saved)
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(next))
    } catch {
      // 저장소에 쓰지 못하면 목록을 그대로 두고 알림 (다시 열면 되살아나므로)
      setMessage(() => t('share.removeFailed', { name: saved.name }))
      return
    }
    setSaves(next)
    setMessage(() => t('share.removed', { name: saved.name }))
  }

  return (
    <details class={styles.block}>
      <summary class={styles.heading}>{t('share.title')}</summary>
      <p class={styles.small}>{t('share.help')}</p>
      <Show when={blocked()}>
        <p id="share-blocked" class={styles.small}>
          {t('share.blocked')}
        </p>
      </Show>
      <div class={styles.actions}>
        <Button
          size="sm"
          onClick={share}
          disabled={blocked()}
          aria-describedby={blockedHint()}
        >
          {t('share.copy')}
        </Button>
      </div>
      <form class={styles.actions} onSubmit={save}>
        <label class="sr-only" for="save-name">
          {t('share.name')}
        </label>
        <input
          id="save-name"
          class={styles.input}
          value={name()}
          maxLength={40}
          placeholder={t('share.name')}
          onInput={(e) => setName(e.currentTarget.value)}
        />
        <Button
          size="sm"
          type="submit"
          disabled={blocked()}
          aria-describedby={blockedHint()}
        >
          {t('share.save')}
        </Button>
      </form>
      <Show when={saves().length > 0}>
        <ul class={styles.saves}>
          <For each={saves()}>
            {(saved) => (
              <li>
                <span>{saved.name}</span>
                <span class={styles.actions}>
                  <Button
                    size="sm"
                    onClick={() => load(saved)}
                    aria-label={t('share.loadNamed', { name: saved.name })}
                  >
                    {t('share.load')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => remove(saved)}
                    aria-label={t('share.removeNamed', { name: saved.name })}
                  >
                    {t('share.remove')}
                  </Button>
                </span>
              </li>
            )}
          </For>
        </ul>
      </Show>
      <StatusMessage message={message()} />
    </details>
  )
}
