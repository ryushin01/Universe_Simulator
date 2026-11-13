import { For, Show, createSignal } from 'solid-js'
import { locale } from '@/shared/i18n'
import { Button, ChoiceGroup, SelectField, StatusMessage } from '@/shared/ui'
import { formatMoney, formatPercent, formatSig, length } from '@/shared/lib'
import { BODIES } from '../../model/solar/bodies'
import type { BodyId } from '../../model/solar/bodies'
import {
  STORM_CLASSES,
  stormMitigation,
  stormTravelDays,
} from '../../model/hazards/storm'
import type { StormClass } from '../../model/hazards/storm'
import { world, worldActions } from '../../model/world/store'
import {
  bodyPositionAu,
  hasProject,
  stormFrontAu,
} from '../../model/world/selectors'
import { formatDuration } from '../../model/world/text'
import { pick, t } from '../i18n'
import styles from './panels.module.css'

const TARGETS: Array<BodyId | 'random'> = [
  'earth',
  'mars',
  'jupiter',
  'saturn',
  'random',
]

/** 태양 폭풍 (코로나 질량 방출) */
export function StormPanel() {
  const [cls, setCls] = createSignal<StormClass>('carrington')
  const [target, setTarget] = createSignal<BodyId | 'random'>('earth')
  const [message, setMessage] = createSignal('')
  const l = () => locale()
  const spec = () => STORM_CLASSES[cls()]
  const mitigation = () =>
    stormMitigation(
      hasProject(world(), 'sentinel'),
      hasProject(world(), 'grid-shield'),
    )
  const earthDays = () => {
    const p = bodyPositionAu(world(), 'earth')
    return p ? stormTravelDays(spec().speedKms, length(p)) : null
  }
  const active = () =>
    world().storms.filter((s) => {
      const r = stormFrontAu(s, world().year, STORM_CLASSES[s.cls].speedKms)
      return r > 0 && r < 45
    })
  const launch = () =>
    setMessage(pick(worldActions.launchStorm(cls(), target()).message))

  return (
    <div class={styles.panel}>
      <p class={styles.intro}>{t('storm.intro')}</p>
      <ChoiceGroup<StormClass>
        legend={t('storm.class')}
        value={cls()}
        onChange={setCls}
        columns={2}
        choices={(Object.keys(STORM_CLASSES) as StormClass[]).map((c) => ({
          value: c,
          label: pick(STORM_CLASSES[c].name),
          hint: pick(STORM_CLASSES[c].note),
        }))}
      />
      <SelectField
        label={t('storm.direction')}
        value={target()}
        onChange={(v) => setTarget(v as BodyId | 'random')}
        options={TARGETS.map((id) => ({
          value: id,
          label: id === 'random' ? t('storm.random') : pick(BODIES[id].name),
        }))}
      />
      <dl class={styles.preview}>
        <dt>{t('storm.arrival')}</dt>
        <dd>
          {target() === 'earth' && earthDays() !== null
            ? formatDuration(earthDays()! / 365.25, l())
            : target() === 'earth'
              ? '—'
              : t('storm.miss')}
        </dd>
        <dt>{t('storm.damage')}</dt>
        <dd
          class={
            spec().earthLossB * (1 - mitigation()) >= 100 ? styles.danger : ''
          }
        >
          {target() === 'earth'
            ? formatMoney(spec().earthLossB * (1 - mitigation()), l())
            : '—'}
        </dd>
        <dt>{t('storm.ready')}</dt>
        <dd>
          {t('storm.readyValue', { percent: formatPercent(mitigation(), l()) })}
        </dd>
      </dl>
      <Button variant="danger" onClick={launch}>
        {t('storm.launch')}
      </Button>
      <StatusMessage message={message()} />
      <Show when={active().length > 0}>
        <section aria-labelledby="storm-active-title" class={styles.panel}>
          <h3 id="storm-active-title" class={styles.caption}>
            {t('storm.active')}
          </h3>
          <ul class={styles.cards}>
            <For each={active().map((s) => s.id)}>
              {(id) => {
                const storm = () => world().storms.find((s) => s.id === id)
                return (
                  <Show when={storm()}>
                    {(s) => (
                      <li class={styles.small}>
                        {t('storm.front', {
                          name: pick(STORM_CLASSES[s().cls].name),
                          au: formatSig(
                            stormFrontAu(
                              s(),
                              world().year,
                              STORM_CLASSES[s().cls].speedKms,
                            ),
                            l(),
                            2,
                          ),
                        })}
                      </li>
                    )}
                  </Show>
                )
              }}
            </For>
          </ul>
        </section>
      </Show>
    </div>
  )
}
