import { Show, createSignal } from 'solid-js'
import { both, locale } from '@/shared/i18n'
import { Button, ChoiceGroup, RangeField, StatusMessage } from '@/shared/ui'
import { formatSig, length } from '@/shared/lib'
import {
  FLYBY_PRESETS,
  INTRUDERS,
  approachYears,
  nbodyZone,
  stellarEngineShiftAu,
  tidalRadiusAu,
} from '../../model/hazards/flyby'
import type { IntruderKind } from '../../model/hazards/flyby'
import { viewActions } from '../../model/view'
import { world, worldActions } from '../../model/world/store'
import {
  activeFlyby,
  hasProject,
  intruderPositionAu,
} from '../../model/world/selectors'
import { formatDuration } from '../../model/world/text'
import { pick, t } from '../i18n'
import type { MessageKey } from '../i18n'
import styles from './panels.module.css'

/** 가까울 때 거리: 0.3 AU ~ 2만 AU (로그 눈금) */
const closestFrom = (v: number) => Number((0.3 * 10 ** (v / 25)).toPrecision(2))
const sliderFrom = (au: number) => Math.round(25 * Math.log10(au / 0.3))

/** 블랙홀·떠돌이 별의 근접 통과와 ‘태양이 블랙홀이 된다면’ 사고 실험 */
export function BlackHolePanel() {
  const [presetId, setPresetId] = createSignal<string>('black-hole')
  const preset0 = FLYBY_PRESETS.find((p) => p.id === 'black-hole')!
  const [kind, setKind] = createSignal<IntruderKind>(preset0.kind)
  const [mass, setMass] = createSignal(preset0.massSun)
  const [closest, setClosest] = createSignal(preset0.closestAu)
  const [speed, setSpeed] = createSignal(preset0.speedKms)
  const [inclination, setInclination] = createSignal(preset0.inclination)
  const [message, setMessage] = createSignal('')
  const [error, setError] = createSignal(false)
  const l = () => locale()
  const preset = () => FLYBY_PRESETS.find((p) => p.id === presetId())

  const choosePreset = (id: string) => {
    setPresetId(id)
    const p = FLYBY_PRESETS.find((x) => x.id === id)
    if (!p) return
    setKind(p.kind)
    setMass(p.massSun)
    setClosest(p.closestAu)
    setSpeed(p.speedKms)
    setInclination(p.inclination)
  }

  const custom = () => presetId() === 'custom'
  const lead = () =>
    preset()?.leadYears ??
    (nbodyZone(closest()) !== null ? approachYears(closest(), speed()) : 1e5)
  const engineShift = () =>
    hasProject(world(), 'stellar-engine') ? stellarEngineShiftAu(lead()) : 0
  const active = () => activeFlyby(world())

  const launch = () => {
    const p = preset()
    const spec = INTRUDERS[kind()]
    const name =
      p && !custom()
        ? p.name
        : both(
            `${spec.name.ko} (${formatSig(closest(), 'ko', 2)} AU)`,
            `${spec.name.en} (${formatSig(closest(), 'en', 2)} AU)`,
          )
    const result = worldActions.launchFlyby({
      presetId: custom() ? null : presetId(),
      kind: kind(),
      massSun: custom() ? spec.massSun : mass(),
      closestAu: closest(),
      speedKms: speed(),
      inclination: inclination(),
      longitude: p && !custom() ? p.longitude : 90,
      leadYears: p && !custom() ? p.leadYears : undefined,
      name,
    })
    setError(!result.ok)
    setMessage(pick(result.message))
  }

  const thought = () => {
    const result = worldActions.setSunBlackHole(!world().sunBlackHole)
    setMessage(pick(result.message))
    setError(false)
  }

  return (
    <div class={styles.panel}>
      <p class={styles.intro}>{t('hole.intro')}</p>
      <section aria-labelledby="hole-thought-title" class={styles.card}>
        <h3 id="hole-thought-title" class={styles.caption}>
          {t('hole.thought')}
        </h3>
        <p class={styles.small}>{t('hole.thoughtText')}</p>
        <Button
          variant={world().sunBlackHole ? 'primary' : 'danger'}
          size="sm"
          onClick={thought}
        >
          {world().sunBlackHole ? t('hole.restore') : t('hole.makeHole')}
        </Button>
      </section>
      <ChoiceGroup<string>
        legend={t('hole.flyby')}
        value={presetId()}
        onChange={choosePreset}
        columns={2}
        choices={[
          ...FLYBY_PRESETS.map((p) => ({ value: p.id, label: pick(p.name) })),
          { value: 'custom', label: t('hole.custom') },
        ]}
      />
      <Show when={preset()}>
        <p class={styles.small}>{pick(preset()!.note)}</p>
      </Show>
      <Show when={custom()}>
        <ChoiceGroup<IntruderKind>
          legend={t('hole.kind')}
          value={kind()}
          onChange={setKind}
          columns={2}
          choices={(Object.keys(INTRUDERS) as IntruderKind[]).map((k) => ({
            value: k,
            label: pick(INTRUDERS[k].name),
          }))}
        />
        <RangeField
          label={t('hole.closest')}
          min={0}
          max={sliderFrom(20_000)}
          value={sliderFrom(closest())}
          valueText={`${formatSig(closest(), l(), 2)} AU`}
          onInput={(v) => setClosest(closestFrom(v))}
        />
        <RangeField
          label={t('hole.speed')}
          min={5}
          max={80}
          value={speed()}
          valueText={l() === 'ko' ? `초속 ${speed()}km` : `${speed()} km/s`}
          onInput={setSpeed}
        />
        <RangeField
          label={t('hole.inclination')}
          min={0}
          max={90}
          step={5}
          value={inclination()}
          valueText={`${inclination()}°`}
          onInput={setInclination}
        />
      </Show>
      <dl class={styles.preview}>
        <dt>{t('hole.when')}</dt>
        <dd>{formatDuration(lead(), l())}</dd>
        <dt>{t('hole.method')}</dt>
        <dd>
          {nbodyZone(closest() + engineShift()) !== null
            ? t('hole.nbody')
            : t('hole.shower')}
        </dd>
        <Show when={INTRUDERS[kind()].blackHole}>
          <dt>{t('hole.tidal')}</dt>
          <dd>{`${formatSig(tidalRadiusAu(6371, 1, custom() ? INTRUDERS[kind()].massSun : mass()), l(), 2)} AU`}</dd>
        </Show>
      </dl>
      <Button variant="danger" onClick={launch}>
        {t('hole.launch')}
      </Button>
      <StatusMessage message={message()} tone={error() ? 'error' : 'info'} />
      <Show when={active()}>
        {(f) => (
          <>
            <p class={styles.small}>
              {t('hole.status', {
                name: pick(f().name),
                au: formatSig(length(intruderPositionAu(world(), f())), l(), 3),
              })}{' '}
              <span class={styles.tag}>
                {t(`hole.phase.${f().phase}` as MessageKey)}
              </span>
            </p>
            {/* 3D에서 눌러 고르는 것과 같은 동작을 키보드로도 */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => viewActions.select('intruder')}
            >
              {t('hole.follow')}
            </Button>
          </>
        )}
      </Show>
    </div>
  )
}
