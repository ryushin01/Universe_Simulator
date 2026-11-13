import { For, createMemo } from 'solid-js'
import { locale } from '@/shared/i18n'
import { Button, StatusMessage } from '@/shared/ui'
import { formatSig } from '@/shared/lib'
import { METEOR_SHOWERS, nextPeakYear } from '../../model/hazards/meteors'
import { world, worldActions } from '../../model/world/store'
import { currentShower, isRemoved } from '../../model/world/selectors'
import { formatSimDate } from '../../model/world/text'
import { viewActions } from '../../model/view'
import { createMessage, pick, t } from '../i18n'
import styles from './panels.module.css'

/** 연간 유성우와 유성 폭풍 */
export function MeteorPanel() {
  const [message, setMessage] = createMessage()
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
    const shower = METEOR_SHOWERS.find((m) => m.id === id)
    if (!shower) return
    // 목록은 하루 단위로만 다시 계산하므로 지금 시각으로 다시 구함
    const peak = nextPeakYear(shower, world().year)
    const eve = peak - 1 / 365.25
    if (eve <= world().year) {
      // 이미 극대 전날이 지났으면 건너뛸 필요 없이 재생하면 됨
      viewActions.selectIn('solar', 'earth')
      setMessage(() =>
        t('meteor.soon', {
          name: pick(shower.name),
          date: formatSimDate(peak, l()),
        }),
      )
      return
    }
    const result = worldActions.jumpTo(eve)
    if (!result.ok) {
      setMessage(() => pick(result.message))
      return
    }
    worldActions.setSpeed(0)
    viewActions.selectIn('solar', 'earth')
    setMessage(() => t('meteor.jumped', { name: pick(shower.name) }))
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
                        onClick={() => {
                          const result = worldActions.startMeteorStorm(
                            entry.shower.id,
                          )
                          setMessage(() => pick(result.message))
                        }}
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
