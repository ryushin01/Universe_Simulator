import { For, createMemo, createSignal } from 'solid-js'
import { locale } from '@/shared/i18n'
import { Button, StatusMessage } from '@/shared/ui'
import { formatSig } from '@/shared/lib'
import { METEOR_SHOWERS, nextPeakYear } from '../../model/hazards/meteors'
import { world, worldActions } from '../../model/world/store'
import { currentShower, isRemoved } from '../../model/world/selectors'
import { formatSimDate } from '../../model/world/text'
import { viewActions } from '../../model/view'
import { pick, t } from '../i18n'
import styles from './panels.module.css'

/** 연간 유성우와 유성 폭풍 */
export function MeteorPanel() {
  const [message, setMessage] = createSignal('')
  const l = () => locale()
  // 날짜가 바뀔 때만 다시 계산
  const day = createMemo(() => Math.floor(world().year * 365.25))
  const peaks = createMemo(() => {
    const year = day() / 365.25
    return METEOR_SHOWERS.map((s) => ({
      shower: s,
      peak: nextPeakYear(s, year),
    }))
  })
  const now = () => currentShower(world())
  const earthGone = () => isRemoved(world(), 'earth')

  const goTo = (id: string) => {
    const entry = peaks().find((p) => p.shower.id === id)
    if (!entry) return
    const result = worldActions.jumpTo(entry.peak - 1 / 365.25)
    if (!result.ok) {
      setMessage(pick(result.message))
      return
    }
    worldActions.setSpeed(0)
    viewActions.selectIn('solar', 'earth')
    setMessage(t('meteor.jumped', { name: pick(entry.shower.name) }))
  }

  return (
    <div class={styles.panel}>
      <p class={styles.intro}>{t('meteor.intro')}</p>
      <p class={styles.small}>
        {now()
          ? t('meteor.now', {
              name: pick(now()!.shower.name),
              zhr: formatSig(now()!.zhr, l(), 2),
            })
          : t('meteor.quiet')}
      </p>
      <div
        class={styles.tableWrap}
        tabIndex={0}
        role="region"
        aria-labelledby="meteor-caption"
      >
        <table class={styles.table}>
          <caption id="meteor-caption">{t('meteor.caption')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('meteor.name')}</th>
              <th scope="col">{t('meteor.peak')}</th>
              <th scope="col">{t('meteor.zhr')}</th>
              <th scope="col">{t('meteor.actions')}</th>
            </tr>
          </thead>
          <tbody>
            <For each={peaks()}>
              {(entry) => (
                <tr>
                  <th scope="row">
                    {pick(entry.shower.name)}
                    <span class={styles.small}>
                      <br />
                      {t('meteor.parent')}: {pick(entry.shower.parent)}
                    </span>
                  </th>
                  <td>{formatSimDate(entry.peak, l())}</td>
                  <td>{entry.shower.zhr}</td>
                  <td>
                    <div class={styles.presets}>
                      <Button
                        size="sm"
                        disabled={earthGone()}
                        aria-label={t('meteor.goNamed', {
                          name: pick(entry.shower.name),
                        })}
                        onClick={() => goTo(entry.shower.id)}
                      >
                        {t('meteor.go')}
                      </Button>
                      <Button
                        size="sm"
                        disabled={earthGone()}
                        aria-label={t('meteor.stormNamed', {
                          name: pick(entry.shower.name),
                        })}
                        onClick={() =>
                          setMessage(
                            pick(
                              worldActions.startMeteorStorm(entry.shower.id)
                                .message,
                            ),
                          )
                        }
                      >
                        {t('meteor.storm')}
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
      <StatusMessage message={message()} />
    </div>
  )
}
