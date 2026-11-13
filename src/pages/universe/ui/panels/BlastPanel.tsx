import { Show, createSignal } from 'solid-js'
import { locale } from '@/shared/i18n'
import { Button, SelectField, StatusMessage } from '@/shared/ui'
import { formatPercent, formatSig } from '@/shared/lib'
import {
  BLAST_SOURCES,
  debrisArrivalYears,
  ozoneLoss,
  peakApparentMagnitude,
} from '../../model/hazards/stellar'
import type { BlastKind } from '../../model/hazards/stellar'
import { world, worldActions } from '../../model/world/store'
import { formatDuration } from '../../model/world/text'
import { pick, t } from '../i18n'
import type { MessageKey } from '../i18n'
import styles from './panels.module.css'

/** 초신성·감마선 폭발·킬로노바·마그네타 거대 플레어 */
export function BlastPanel() {
  const [sourceId, setSourceId] = createSignal('betelgeuse')
  const [message, setMessage] = createSignal('')
  const l = () => locale()
  const source = () => BLAST_SOURCES.find((s) => s.id === sourceId())!
  const magnitude = () => peakApparentMagnitude(source())
  const loss = () => ozoneLoss(source())
  const exploded = () =>
    source().real && world().blasts.some((b) => b.sourceId === sourceId())
  const trigger = () =>
    setMessage(pick(worldActions.triggerBlast(sourceId()).message))

  return (
    <div class={styles.panel}>
      <p class={styles.intro}>{t('blast.intro')}</p>
      <SelectField
        label={t('blast.source')}
        value={sourceId()}
        onChange={setSourceId}
        options={BLAST_SOURCES.map((s) => ({
          value: s.id,
          label: pick(s.name),
          group: t(`kind.${s.kind}` as MessageKey),
        }))}
        description={pick(source().note)}
      />
      <dl class={styles.preview}>
        <dt>{t('blast.distance')}</dt>
        <dd>
          {l() === 'ko'
            ? `${formatSig(source().distanceLy, l(), 4)}광년`
            : `${formatSig(source().distanceLy, l(), 4)} ly`}{' '}
          <span class={styles.tag}>
            {source().real ? t('blast.real') : t('blast.hypothetical')}
          </span>
        </dd>
        <dt>{t('blast.magnitude')}</dt>
        <dd>
          {magnitude() === null
            ? t('blast.flash')
            : t('blast.magnitudeValue', {
                mag: formatSig(magnitude()!, l(), 3),
              })}
        </dd>
        <dt>{t('blast.ozone')}</dt>
        <dd
          class={
            loss() >= 0.3 ? styles.danger : loss() >= 0.05 ? styles.warn : ''
          }
        >
          {formatPercent(loss(), l(), loss() < 0.01 ? 1 : 0)}
        </dd>
        <Show
          when={
            source().distanceLy <= 100 &&
            (source().kind as BlastKind) !== 'grb' &&
            source().kind !== 'magnetar'
          }
        >
          <dt>{t('blast.debris')}</dt>
          <dd>
            {formatDuration(debrisArrivalYears(source().distanceLy), l())}
          </dd>
        </Show>
      </dl>
      <Button variant="danger" onClick={trigger} disabled={exploded()}>
        {exploded() ? t('blast.done') : t('blast.trigger')}
      </Button>
      <StatusMessage message={message()} />
    </div>
  )
}
