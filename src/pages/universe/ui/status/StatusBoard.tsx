import { Show } from 'solid-js'
import { locale } from '@/shared/i18n'
import {
  formatBig,
  formatMoney,
  formatNumber,
  formatPercent,
  formatPower,
  formatSig,
  formatTemperature,
} from '@/shared/lib'
import { world } from '../../model/world/store'
import {
  bodyInsolation,
  civilizationPower,
  currentShower,
  earthPopulation,
  earthTemperatureC,
  habitableZoneNow,
  incomeB,
  isRemoved,
  kardashev,
  offWorldPopulation,
  sunState,
} from '../../model/world/selectors'
import { habitability } from '../../model/solar/climate'
import { formatPeople } from '../../model/world/text'
import { pick, t } from '../i18n'
import type { MessageKey } from '../i18n'
import styles from './status.module.css'

const TONE: Record<string, string> = {
  frozen: styles.danger,
  cold: styles.warn,
  habitable: styles.good,
  hot: styles.warn,
  boiling: styles.danger,
  barren: styles.danger,
  molten: styles.danger,
}

/** 태양·지구·거주 가능 영역·문명 수치 */
export function StatusBoard() {
  const l = () => locale()
  const sun = () => sunState(world())
  const earthGone = () => isRemoved(world(), 'earth')
  const temp = () => earthTemperatureC(world())
  const condition = () => habitability(temp() ?? -270, world().earth.ocean)
  const zone = () => habitableZoneNow(world())
  const power = () => civilizationPower(world())
  const k = () => kardashev(power())
  const shower = () => currentShower(world())
  return (
    <section aria-labelledby="board-title" class={styles.block}>
      <h3 id="board-title" class="sr-only">
        {t('status.board')}
      </h3>
      <div class={styles.group}>
        <p class={styles.heading}>{t('status.sun')}</p>
        <dl class={styles.list}>
          <dt>{t('status.stage')}</dt>
          <dd>
            {sun().blackHole
              ? t('stage.blackHole')
              : t(`stage.${sun().stage}` as MessageKey)}
          </dd>
          <dt>{t('status.luminosity')}</dt>
          <dd>
            {sun().blackHole
              ? '0'
              : `${formatSig(sun().luminosity, l(), 3)} L☉`}
          </dd>
          <dt>{t('status.radius')}</dt>
          <dd>{`${formatSig(sun().radius, l(), 3)} R☉`}</dd>
          <dt>{t('dossier.surface')}</dt>
          <dd>
            {sun().blackHole
              ? '—'
              : `${formatBig(Math.round(sun().temperature), l())} K`}
          </dd>
        </dl>
      </div>
      <div class={styles.group}>
        <p class={styles.heading}>{t('status.earth')}</p>
        <Show
          when={!earthGone()}
          fallback={<p class={styles.danger}>{t('status.gone')}</p>}
        >
          <dl class={styles.list}>
            <dt>{t('status.condition')}</dt>
            <dd class={TONE[condition()]}>
              {t(`habit.${condition()}` as MessageKey)}
            </dd>
            <dt>{t('status.earthTemp')}</dt>
            <dd>{formatTemperature(temp() ?? 0, l())}</dd>
            <dt>{t('status.sunlight')}</dt>
            <dd>{`${formatSig(bodyInsolation(world(), 'earth'), l(), 3)}×`}</dd>
            <dt>{t('status.ocean')}</dt>
            <dd>{formatPercent(world().earth.ocean, l())}</dd>
            <dt>{t('status.ozone')}</dt>
            <dd>{formatPercent(world().earth.ozone, l())}</dd>
            <dt>{t('status.biosphere')}</dt>
            <dd>{formatNumber(world().earth.biosphere, l())}</dd>
            <Show when={shower()}>
              <dt>{t('status.shower')}</dt>
              <dd>
                {t('status.showerValue', {
                  name: pick(shower()!.shower.name),
                  zhr: formatSig(shower()!.zhr, l(), 2),
                })}
              </dd>
            </Show>
          </dl>
        </Show>
      </div>
      <div class={styles.group}>
        <p class={styles.heading}>{t('status.hz')}</p>
        <p class="num">
          {sun().blackHole
            ? '—'
            : `${formatSig(zone().inner, l(), 3)} – ${formatSig(zone().outer, l(), 3)} AU`}
        </p>
      </div>
      <div class={styles.group}>
        <p class={styles.heading}>{t('status.civ')}</p>
        <dl class={styles.list}>
          <dt>{t('status.population')}</dt>
          <dd>{formatPeople(earthPopulation(world()), l())}</dd>
          <dt>{t('status.offworld')}</dt>
          <dd>{formatPeople(offWorldPopulation(world()), l())}</dd>
          <dt>{t('status.energy')}</dt>
          <dd>{power() > 0 ? `${formatPower(power(), 2)} W` : '0'}</dd>
          <dt>{t('status.kardashev')}</dt>
          <dd>{k() === null ? '—' : formatNumber(k()!, l(), 2)}</dd>
          <dt>{t('status.budget')}</dt>
          <dd>
            {formatMoney(world().budget, l())}
            <span class={styles.small}>
              {' '}
              ·{' '}
              {t('status.income', {
                amount: formatMoney(incomeB(world()), l()),
              })}
            </span>
          </dd>
          <Show when={world().losses > 0}>
            <dt>{t('status.losses')}</dt>
            <dd class={styles.warn}>{formatMoney(world().losses, l())}</dd>
          </Show>
        </dl>
      </div>
    </section>
  )
}
