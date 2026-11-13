import { For, Show, createSignal } from 'solid-js'
import { locale } from '@/shared/i18n'
import {
  Button,
  ChoiceGroup,
  RangeField,
  SelectField,
  StatusMessage,
} from '@/shared/ui'
import { formatMoney, formatSig, formatSigned } from '@/shared/lib'
import { BODIES } from '../../model/solar/bodies'
import type { BodyId } from '../../model/solar/bodies'
import {
  DEFLECT_METHODS,
  DIAMETER_STEPS,
  IMPACTOR_KINDS,
  IMPACT_TARGETS,
  SEVERITY_TEXT,
  WARNING_STEPS,
  impactOutcome,
} from '../../model/hazards/impact'
import type {
  DeflectMethod,
  ImpactorKind,
  WarningId,
} from '../../model/hazards/impact'
import { world, worldActions } from '../../model/world/store'
import { hasProject, isRemoved } from '../../model/world/selectors'
import { formatDuration, formatKm, formatMt } from '../../model/world/text'
import type { Impact } from '../../model/world/types'
import { createMessage, pick, t } from '../i18n'
import type { MessageKey } from '../i18n'
import styles from './panels.module.css'

const PRESETS: Array<{
  key: MessageKey
  target: BodyId
  kind: ImpactorKind
  diameter: number
  warning: WarningId
}> = [
  {
    key: 'impact.preset.chelyabinsk',
    target: 'earth',
    kind: 'stony',
    diameter: 20,
    warning: 'day',
  },
  {
    key: 'impact.preset.tunguska',
    target: 'earth',
    kind: 'stony',
    diameter: 50,
    warning: 'month',
  },
  {
    key: 'impact.preset.apophis',
    target: 'earth',
    kind: 'stony',
    diameter: 340,
    warning: 'year5',
  },
  {
    key: 'impact.preset.chicxulub',
    target: 'earth',
    kind: 'stony',
    diameter: 10_000,
    warning: 'year1',
  },
  {
    key: 'impact.preset.sl9',
    target: 'jupiter',
    kind: 'comet',
    diameter: 2000,
    warning: 'month',
  },
  {
    key: 'impact.preset.moon',
    target: 'moon',
    kind: 'stony',
    diameter: 50,
    warning: 'month',
  },
]

function IncomingCard(props: { id: number }) {
  const [method, setMethod] = createSignal<DeflectMethod>('kinetic')
  const [count, setCount] = createSignal(5)
  const [message, setMessage] = createMessage()
  const [error, setError] = createSignal(false)
  const l = () => locale()
  const im = () => world().impacts.find((i) => i.id === props.id) as Impact
  const done = () =>
    im()
      .missions.filter((m) => m.applied)
      .reduce((s, m) => s + m.missKm, 0)
  const planned = () => im().missions.reduce((s, m) => s + m.missKm, 0)
  const ratio = () => Math.min(1, planned() / im().requiredKm)
  const spec = () => DEFLECT_METHODS[method()]
  const send = () => {
    const result = worldActions.launchDeflection(im().id, method(), count())
    setError(!result.ok)
    setMessage(() => pick(result.message))
  }
  return (
    <li class={styles.card}>
      <div class={styles.cardHead}>
        <span class={styles.cardTitle}>{im().designation}</span>
        <span class={styles.small}>
          {t('impact.left', {
            time: formatDuration(
              Math.max(0, im().impactYear - world().year),
              l(),
            ),
            target: pick(BODIES[im().target].name),
          })}
        </span>
      </div>
      <p class={styles.small}>
        {formatKm(im().diameterM / 1000, l())} ·{' '}
        {pick(IMPACTOR_KINDS[im().kind].name)}
      </p>
      <div class={styles.meter} aria-hidden="true">
        <span style={{ width: `${ratio() * 100}%` }} />
      </div>
      <p class={styles.small}>
        {t('impact.progress', {
          done: formatKm(done(), l()),
          need: formatKm(im().requiredKm, l()),
        })}
        <Show when={planned() > done()}>
          {' '}
          · {t('impact.planned', { planned: formatKm(planned(), l()) })}
        </Show>
      </p>
      <SelectField
        label={t('impact.method')}
        value={method()}
        onChange={(v) => setMethod(v as DeflectMethod)}
        options={(Object.keys(DEFLECT_METHODS) as DeflectMethod[]).map((m) => ({
          value: m,
          label: pick(DEFLECT_METHODS[m].name),
        }))}
        description={pick(spec().note)}
      />
      <div class={styles.row}>
        <label class={styles.field}>
          <span class="label-caps">{t('impact.count')}</span>
          <input
            type="number"
            min="1"
            max="20"
            step="1"
            value={count()}
            onInput={(e) =>
              // 탐사선은 한 대 단위 (1.5대처럼 소수는 반올림)
              setCount(
                Math.min(
                  20,
                  Math.max(1, Math.round(Number(e.currentTarget.value)) || 1),
                ),
              )
            }
            class={styles.number}
          />
        </label>
        <Button size="sm" variant="primary" onClick={send}>
          {t('impact.send')}
        </Button>
      </div>
      <p class={styles.small}>
        {t('impact.cost', {
          cost: formatMoney(spec().costB * count(), l()),
          years: spec().travelYears,
        })}
      </p>
      <StatusMessage message={message()} tone={error() ? 'error' : 'info'} />
    </li>
  )
}

/** 소행성·혜성 충돌과 궤도 편향 */
export function ImpactPanel() {
  const [target, setTarget] = createSignal<BodyId>('earth')
  const [kind, setKind] = createSignal<ImpactorKind>('stony')
  const [diameterIndex, setDiameterIndex] = createSignal(5)
  const [warning, setWarning] = createSignal<WarningId>('year5')
  const [message, setMessage] = createMessage()
  const [error, setError] = createSignal(false)
  const l = () => locale()
  const diameter = () => DIAMETER_STEPS[diameterIndex()]
  const outcome = () => impactOutcome(target(), kind(), diameter())
  const incoming = () => world().impacts.filter((i) => i.status === 'incoming')

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setTarget(preset.target)
    setKind(preset.kind)
    setDiameterIndex(
      Math.max(
        0,
        DIAMETER_STEPS.indexOf(
          preset.diameter as (typeof DIAMETER_STEPS)[number],
        ),
      ),
    )
    setWarning(preset.warning)
  }

  const launch = () => {
    const years = WARNING_STEPS.find((w) => w.id === warning())!.years
    const result = worldActions.launchImpact({
      target: target(),
      kind: kind(),
      diameterM: diameter(),
      warningYears: years,
    })
    setError(!result.ok)
    setMessage(() => pick(result.message))
  }

  return (
    <div class={styles.panel}>
      <p class={styles.intro}>{t('impact.intro')}</p>
      <div>
        <p class={styles.caption}>{t('impact.presets')}</p>
        <div class={styles.presets}>
          <For each={PRESETS}>
            {(preset) => (
              <Button size="sm" onClick={() => applyPreset(preset)}>
                {t(preset.key)}
              </Button>
            )}
          </For>
        </div>
      </div>
      <SelectField
        label={t('impact.target')}
        value={target()}
        onChange={(v) => setTarget(v as BodyId)}
        options={IMPACT_TARGETS.map((id) => ({
          value: id,
          label: pick(BODIES[id].name),
          disabled: isRemoved(world(), id),
        }))}
      />
      <ChoiceGroup<ImpactorKind>
        legend={t('impact.kind')}
        value={kind()}
        onChange={setKind}
        columns={3}
        choices={(Object.keys(IMPACTOR_KINDS) as ImpactorKind[]).map((k) => ({
          value: k,
          label: pick(IMPACTOR_KINDS[k].name),
          hint:
            l() === 'ko'
              ? `초속 ${IMPACTOR_KINDS[k].speedKms}km`
              : `${IMPACTOR_KINDS[k].speedKms} km/s`,
        }))}
      />
      <RangeField
        label={t('impact.diameter')}
        min={0}
        max={DIAMETER_STEPS.length - 1}
        value={diameterIndex()}
        valueText={formatKm(diameter() / 1000, l())}
        onInput={setDiameterIndex}
      />
      <ChoiceGroup<WarningId>
        legend={t('impact.warning')}
        value={warning()}
        onChange={setWarning}
        columns={3}
        choices={WARNING_STEPS.map((w) => ({
          value: w.id,
          label: t(`warning.${w.id}` as MessageKey),
        }))}
      />
      <dl class={styles.preview} aria-label={t('impact.preview')}>
        <dt>{t('impact.energy')}</dt>
        <dd>{formatMt(outcome().energyMt, l())}</dd>
        <dt>{t('impact.speed')}</dt>
        <dd>
          {l() === 'ko'
            ? `초속 ${formatSig(outcome().speedKms, l(), 3)}km`
            : `${formatSig(outcome().speedKms, l(), 3)} km/s`}
        </dd>
        <Show when={outcome().airburst}>
          <dt>{t('impact.airburst')}</dt>
          <dd>✓</dd>
        </Show>
        <Show when={outcome().craterKm !== null}>
          <dt>{t('impact.crater')}</dt>
          <dd>{formatKm(outcome().craterKm!, l())}</dd>
        </Show>
        <Show when={outcome().scarKm !== null}>
          <dt>{t('impact.scar')}</dt>
          <dd>{formatKm(outcome().scarKm!, l())}</dd>
        </Show>
        <Show when={target() === 'earth'}>
          <dt>{t('impact.severity')}</dt>
          <dd
            class={
              outcome().severity >= 5
                ? styles.danger
                : outcome().severity >= 3
                  ? styles.warn
                  : ''
            }
          >
            {pick(SEVERITY_TEXT[outcome().severity])}
          </dd>
          <Show when={outcome().coolingC < 0}>
            <dt>{t('impact.cooling')}</dt>
            <dd>{formatSigned(outcome().coolingC, l())}°C</dd>
          </Show>
        </Show>
      </dl>
      <Button variant="danger" onClick={launch}>
        {t('impact.launch')}
      </Button>
      <StatusMessage message={message()} tone={error() ? 'error' : 'info'} />
      <Show when={hasProject(world(), 'defense-net')}>
        <p class={`${styles.small} ${styles.good}`}>{t('impact.netOn')}</p>
      </Show>
      <section aria-labelledby="incoming-title" class={styles.panel}>
        <h3 id="incoming-title" class={styles.caption}>
          {t('impact.incoming')}
        </h3>
        <Show
          when={incoming().length > 0}
          fallback={<p class={styles.small}>{t('impact.none')}</p>}
        >
          <ul class={styles.cards}>
            {/* id(숫자)로 그려야 상태가 바뀌어도 카드가 다시 만들어지지 않음 */}
            <For each={incoming().map((i) => i.id)}>
              {(id) => <IncomingCard id={id} />}
            </For>
          </ul>
        </Show>
      </section>
    </div>
  )
}
