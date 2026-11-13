import { For, Match, Show, Switch } from 'solid-js'
import { locale } from '@/shared/i18n'
import type { Locale } from '@/shared/i18n'
import { Button, RangeField, SelectField } from '@/shared/ui'
import {
  formatBig,
  formatNumber,
  formatPercent,
  formatPower,
  formatSig,
  formatTemperature,
  length,
} from '@/shared/lib'
import { asset } from '@/shared/config'
import {
  cosmicAge,
  focus,
  scale,
  selected,
  viewActions,
} from '../../model/view'
import { collisionInfo } from '../../model/local/collisionInfo'
import {
  AGE_NOW,
  cosmicAgeAtYear,
  redshift,
  scaleFactor,
} from '../../model/cosmic/cosmology'
import { objectsOf } from '../../model/objects'
import { BODIES, isBodyId, moonsOf } from '../../model/solar/bodies'
import type { BodyId } from '../../model/solar/bodies'
import { blackbodyColor } from '../../model/solar/sun'
import { STAR_BY_ID, starClassName } from '../../model/stars/catalog'
import { GALAXY_OBJECT_BY_ID } from '../../model/galaxy/catalog'
import { GALAXY_TYPE_NAME, LOCAL_GALAXY_BY_ID } from '../../model/local/catalog'
import { COSMIC_BY_ID, STRUCTURE_KIND_NAME } from '../../model/cosmic/catalog'
import { PROJECT_BY_KIND } from '../../model/projects/catalog'
import { world, worldActions } from '../../model/world/store'
import { INTRUDERS } from '../../model/hazards/flyby'
import {
  activeFlyby,
  bodyDistanceAu,
  bodyTemperatureC,
  explorationLevel,
  habitabilityScore,
  intruderPositionAu,
  isComplete,
  structuresAt,
  sunState,
} from '../../model/world/selectors'
import { formatDuration } from '../../model/world/text'
import { orbitalPeriodDays } from '../../model/solar/kepler'
import { pick, t } from '../i18n'
import type { MessageKey } from '../i18n'
import { PassportCard } from './PassportCard'
import styles from './status.module.css'

const KIND_NAME = {
  star: ['항성', 'Star'],
  planet: ['행성', 'Planet'],
  dwarf: ['왜소 행성', 'Dwarf planet'],
  moon: ['위성', 'Moon'],
  comet: ['혜성', 'Comet'],
  asteroid: ['소행성', 'Asteroid'],
} as const

const rgb = (k: number) => {
  const [r, g, b] = blackbodyColor(k)
  return `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`
}

function bodyImage(id: BodyId): string {
  const body = BODIES[id]
  if (id === 'sun')
    return `radial-gradient(circle at 40% 40%, #fff6d8, ${rgb(sunState(world()).temperature)} 55%, #b8551a)`
  if (body.texture) {
    const name = id === 'earth' ? 'earth-albedo-1024' : body.texture
    return `url(${asset(`textures/${name}.webp`)}) 0% 50% / 200% 100% repeat-x`
  }
  return `radial-gradient(circle at 38% 35%, ${body.color}, #1b1712 92%)`
}

const lengthOfDay = (hours: number, l: Locale) => {
  const h = Math.abs(hours)
  const text =
    h >= 48
      ? formatDuration(h / 24 / 365.25, l)
      : l === 'ko'
        ? `${formatSig(h, l, 3)}시간`
        : `${formatSig(h, l, 3)} h`
  return hours < 0
    ? l === 'ko'
      ? `${text} (역방향)`
      : `${text} (retrograde)`
    : text
}

function BodyDossier(props: { id: BodyId }) {
  const l = () => locale()
  const body = () => BODIES[props.id]
  const removed = () =>
    world().removed[props.id] ??
    (body().parent ? world().removed[body().parent!] : undefined)
  const distance = () => bodyDistanceAu(world(), props.id)
  const temp = () => bodyTemperatureC(world(), props.id)
  const level = () => explorationLevel(world(), props.id)
  const habit = () => habitabilityScore(world(), props.id)
  const year = () => {
    const b = body()
    if (b.orbit.type === 'satellite')
      return formatDuration(b.orbit.periodDays / 365.25, l())
    if (b.orbit.type === 'moon') return formatDuration(27.3217 / 365.25, l())
    if (b.orbit.type === 'none') return '—'
    const a = b.orbit.type === 'secular' ? b.orbit.row.a[0] : b.orbit.elements.a
    return formatDuration(orbitalPeriodDays(a) / 365.25, l())
  }
  const subtitle = () => {
    const kind = KIND_NAME[body().kind][l() === 'en' ? 1 : 0]
    const d = distance()
    if (props.id === 'sun') return kind
    if (d === null) return kind
    return l() === 'ko'
      ? `${kind} · 태양에서 ${formatSig(d, l(), 3)} AU`
      : `${kind} · ${formatSig(d, l(), 3)} AU from the Sun`
  }
  const moons = () => moonsOf(props.id)
  return (
    <PassportCard
      title={pick(body().name)}
      subtitle={subtitle()}
      image={bodyImage(props.id)}
      spin={Boolean(body().texture)}
      ring={props.id === 'sun' ? null : habit()}
      ringLabel={
        props.id === 'sun'
          ? undefined
          : `${t('dossier.habitability')} ${formatPercent(habit(), l())}`
      }
      badge={`LV ${level()}`}
      badgeLabel={`${t('dossier.level')}: ${t(`level.${level()}` as MessageKey)}`}
      fields={[
        {
          label: t('dossier.mass'),
          value:
            body().massEarth >= 0.01
              ? `${formatSig(body().massEarth, l(), 3)} M⊕`
              : `${formatPower(body().massEarth * 5.972e24, 2)} kg`,
        },
        {
          label: t('dossier.radius'),
          value: `${formatBig(Math.round(body().radiusKm), l())} km`,
        },
        {
          label: t('dossier.gravity'),
          value: `${formatSig(body().gravity, l(), 3)} m/s²`,
        },
        {
          label: t('dossier.day'),
          value: lengthOfDay(body().rotationHours, l()),
        },
        { label: t('dossier.year'), value: year() },
        {
          label: t('dossier.temperature'),
          value: temp() === null ? '—' : formatTemperature(temp()!, l()),
        },
      ]}
    >
      <p class={styles.small}>{pick(body().summary)}</p>
      <dl class={styles.list}>
        <dt>{t('dossier.atmosphere')}</dt>
        <dd>{pick(body().atmosphere)}</dd>
        <Show when={body().moons}>
          <dt>{t('dossier.moons')}</dt>
          <dd>
            {formatNumber(body().moons!.count, l())}
            {body().moons!.plus ? '+' : ''}
          </dd>
        </Show>
        <dt>{t('dossier.level')}</dt>
        <dd>{pick(body().exploredNote)}</dd>
      </dl>
      <Show when={removed()}>
        <p class={styles.danger}>
          {t('dossier.removed', {
            reason: t(`removed.${removed()!.reason}` as MessageKey),
          })}
        </p>
      </Show>
      <Show when={structuresAt(world(), props.id).length > 0}>
        <div class={styles.group}>
          <p class={styles.heading}>{t('dossier.structures')}</p>
          <ul class={styles.small}>
            <For each={structuresAt(world(), props.id)}>
              {(s) => (
                <li>
                  {pick(PROJECT_BY_KIND[s.kind].name)} ·{' '}
                  {isComplete(world(), s)
                    ? l() === 'ko'
                      ? '완공'
                      : 'complete'
                    : l() === 'ko'
                      ? '건설 중'
                      : 'building'}
                </li>
              )}
            </For>
          </ul>
        </div>
      </Show>
      <Show when={moons().length > 0}>
        <div class={styles.group}>
          <p class={styles.heading}>{t('dossier.moonList')}</p>
          <div class={styles.actions}>
            <For each={moons()}>
              {(moon) => (
                <Button size="sm" onClick={() => viewActions.select(moon)}>
                  {pick(BODIES[moon].name)}
                </Button>
              )}
            </For>
          </div>
        </div>
      </Show>
      <Show when={body().parent}>
        <div class={styles.actions}>
          <Button size="sm" onClick={() => viewActions.select(body().parent!)}>
            {pick(BODIES[body().parent!].name)}
          </Button>
        </div>
      </Show>
    </PassportCard>
  )
}

function StarDossier(props: { id: string }) {
  const l = () => locale()
  const star = () => STAR_BY_ID[props.id]
  return (
    <Show
      when={star()}
      fallback={
        <PassportCard
          title={l() === 'ko' ? '태양' : 'Sun'}
          subtitle={l() === 'ko' ? 'G2V · 우리 별' : 'G2V · our star'}
          image={`radial-gradient(circle at 40% 40%, #fff6d8, ${rgb(5772)} 55%, #b8551a)`}
          ring={null}
          fields={[
            { label: t('dossier.spectral'), value: 'G2V' },
            { label: t('dossier.luminosity'), value: '1 L☉' },
            { label: t('dossier.mass'), value: '1 M☉' },
            { label: t('dossier.radius'), value: '1 R☉' },
            { label: t('dossier.surface'), value: '5,772 K' },
            { label: t('dossier.lightYears'), value: '0' },
          ]}
        />
      }
    >
      {(s) => (
        <PassportCard
          title={pick(s().name)}
          subtitle={pick(starClassName(s().spectral))}
          image={`radial-gradient(circle at 40% 40%, #ffffff, ${rgb(s().temperature)} 50%, #050810 95%)`}
          ring={null}
          fields={[
            { label: t('dossier.spectral'), value: s().spectral },
            {
              label: t('dossier.lightYears'),
              value:
                l() === 'ko'
                  ? `${formatSig(s().distanceLy, l(), 3)}광년`
                  : `${formatSig(s().distanceLy, l(), 3)} ly`,
            },
            {
              label: t('dossier.magnitude'),
              value: formatSig(s().magnitude, l(), 3),
            },
            {
              label: t('dossier.mass'),
              value: `${formatSig(s().mass, l(), 3)} M☉`,
            },
            {
              label: t('dossier.radius'),
              value: `${formatSig(s().radius, l(), 3)} R☉`,
            },
            {
              label: t('dossier.surface'),
              value: `${formatBig(Math.round(s().temperature), l())} K`,
            },
          ]}
        >
          <p class={styles.small}>{pick(s().note)}</p>
          <dl class={styles.list}>
            <dt>{t('dossier.luminosity')}</dt>
            <dd>{formatBig(s().luminosity, l())} L☉</dd>
            <Show when={s().planets}>
              <dt>{t('dossier.planets')}</dt>
              <dd>{pick(s().planets!)}</dd>
            </Show>
          </dl>
          <Show when={s().blastId}>
            <div class={styles.actions}>
              <Button
                variant="danger"
                size="sm"
                onClick={() => worldActions.triggerBlast(s().blastId!)}
              >
                {t('dossier.explode')}
              </Button>
            </div>
          </Show>
        </PassportCard>
      )}
    </Show>
  )
}

const lightYears = (ly: number, l: Locale) =>
  l === 'ko' ? `${formatBig(ly, l)}광년` : `${formatBig(ly, l)} ly`

function GalaxyObjectDossier(props: { id: string }) {
  const l = () => locale()
  const o = () => GALAXY_OBJECT_BY_ID[props.id]
  return (
    <Show when={o()}>
      {(obj) => (
        <PassportCard
          title={pick(obj().name)}
          subtitle={pick(obj().facts)}
          image={
            obj().kind === 'blackHole'
              ? 'radial-gradient(circle, #000 0 38%, #ffcf8a 41%, #3a1d08 55%, #04060d 72%)'
              : 'radial-gradient(circle at 45% 40%, #ffe9c8, #c58ad8 40%, #26305f 75%)'
          }
          ring={null}
          fields={[
            {
              label: t('dossier.lightYears'),
              value:
                obj().id === 'sun' ? '0' : lightYears(obj().distanceLy, l()),
            },
          ]}
        >
          <p class={styles.small}>{pick(obj().note)}</p>
        </PassportCard>
      )}
    </Show>
  )
}

function LocalDossier(props: { id: string }) {
  const l = () => locale()
  const g = () => LOCAL_GALAXY_BY_ID[props.id]
  return (
    <Show when={g()}>
      {(galaxy) => (
        <PassportCard
          title={pick(galaxy().name)}
          subtitle={pick(GALAXY_TYPE_NAME[galaxy().type])}
          image="conic-gradient(from 30deg, #2b3f80, #c8d4ff, #7c9cff, #fff1d6, #2b3f80)"
          ring={null}
          fields={[
            {
              label: t('dossier.type'),
              value: pick(GALAXY_TYPE_NAME[galaxy().type]),
            },
            {
              label: t('dossier.lightYears'),
              value:
                galaxy().id === 'milky-way'
                  ? '0'
                  : lightYears(galaxy().distanceLy, l()),
            },
            {
              label: t('dossier.size'),
              value: lightYears(galaxy().diameterLy, l()),
            },
          ]}
        >
          <p class={styles.small}>{pick(galaxy().note)}</p>
          <Show
            when={
              (galaxy().id === 'andromeda' || galaxy().id === 'milky-way') &&
              collisionInfo()
            }
          >
            {(info) => (
              <dl class={styles.list}>
                <dt>{t('local.separation')}</dt>
                <dd>{lightYears(Math.round(info().separationLy), l())}</dd>
              </dl>
            )}
          </Show>
          <Show when={collisionInfo()?.merged}>
            <p class={styles.good}>{t('local.merged')}</p>
          </Show>
          <Show when={collisionInfo()?.catchingUp}>
            <p class={styles.small}>{t('local.catchingUp')}</p>
          </Show>
          <p class={styles.small}>{t('local.help')}</p>
        </PassportCard>
      )}
    </Show>
  )
}

function CosmicDossier(props: { id: string }) {
  const l = () => locale()
  const s = () => COSMIC_BY_ID[props.id]
  return (
    <Show when={s()}>
      {(structure) => (
        <PassportCard
          title={pick(structure().name)}
          subtitle={pick(STRUCTURE_KIND_NAME[structure().kind])}
          image={
            structure().kind === 'void'
              ? 'radial-gradient(circle, #04060d 0 55%, #7c9cff 70%, #04060d 80%)'
              : 'radial-gradient(circle at 30% 40%, #fff 0 2%, transparent 3%), radial-gradient(circle at 65% 60%, #c8d4ff 0 2%, transparent 3%), radial-gradient(circle, #7c9cff, #1a2550 70%)'
          }
          ring={null}
          fields={[
            {
              label: t('dossier.type'),
              value: pick(STRUCTURE_KIND_NAME[structure().kind]),
            },
            {
              label: t('dossier.lightYears'),
              value:
                structure().distanceMly === 0
                  ? '—'
                  : lightYears(structure().distanceMly * 1e6, l()),
            },
            {
              label: t('dossier.size'),
              value: lightYears(structure().sizeMly * 1e6, l()),
            },
          ]}
        >
          <p class={styles.small}>{pick(structure().note)}</p>
        </PassportCard>
      )}
    </Show>
  )
}

/** 블랙홀·떠돌이 별처럼 태양계를 지나가는 천체 (3D에서 고르거나 블랙홀 탭에서 따라가기) */
function IntruderDossier() {
  const l = () => locale()
  return (
    <Show
      when={activeFlyby(world())}
      fallback={<p class={styles.small}>{t('dossier.intruderGone')}</p>}
    >
      {(f) => {
        const spec = () => INTRUDERS[f().kind]
        const au = (value: number) => `${formatSig(value, l(), 3)} AU`
        return (
          <PassportCard
            title={pick(f().name)}
            subtitle={`${pick(spec().name)} · ${t('dossier.intruder')}`}
            image={
              spec().blackHole
                ? 'radial-gradient(circle, #000 0 38%, #ffcf8a 41%, #3a1d08 55%, #04060d 72%)'
                : `radial-gradient(circle at 40% 40%, #ffffff, ${spec().color} 50%, #050810 95%)`
            }
            ring={null}
            fields={[
              {
                label: t('dossier.mass'),
                value: `${formatSig(f().massSun, l(), 3)} M☉`,
              },
              {
                label: t('dossier.distance'),
                value: au(length(intruderPositionAu(world(), f()))),
              },
              {
                label: t('dossier.speed'),
                value:
                  l() === 'ko'
                    ? `초속 ${formatSig(f().speedKms, l(), 3)}km`
                    : `${formatSig(f().speedKms, l(), 3)} km/s`,
              },
              {
                label: t('dossier.closest'),
                value: au(f().closestAu + f().shiftAu),
              },
              {
                label: t('dossier.phase'),
                value: t(`hole.phase.${f().phase}` as MessageKey),
              },
            ]}
          />
        )
      }}
    </Show>
  )
}

const AGE_STEPS = 60

/** 우주 거대 구조가 자라는 모습: 우주 나이 조절 */
function CosmicAgeControl() {
  const l = () => locale()
  const age = () => cosmicAge() ?? cosmicAgeAtYear(world().year)
  const step = () =>
    Math.round((Math.min(age(), AGE_NOW) / AGE_NOW) * AGE_STEPS)
  const label = () => {
    const a = age()
    const z = redshift(scaleFactor(Math.max(a, 0.05)))
    const text =
      l() === 'ko'
        ? `${formatSig(a * 10, l(), 3)}억 년`
        : `${formatSig(a, l(), 3)} billion yr`
    return t('cosmic.ageValue', {
      age: text,
      z: formatSig(Math.max(z, 0), l(), 2),
    })
  }
  return (
    <div class={styles.block}>
      <RangeField
        label={t('cosmic.age')}
        min={1}
        max={AGE_STEPS}
        value={Math.max(1, step())}
        valueText={label()}
        onInput={(v) => viewActions.setCosmicAge((v / AGE_STEPS) * AGE_NOW)}
        description={t('cosmic.help')}
      />
      <div class={styles.actions}>
        <Button
          size="sm"
          disabled={cosmicAge() === null}
          onClick={() => viewActions.setCosmicAge(null)}
        >
          {t('cosmic.now')}
        </Button>
      </div>
    </div>
  )
}

/** 고른 대상의 정보 (규모마다 다름) */
export function Dossier() {
  const id = () => selected()
  // 지나가는 천체도 목적지처럼 고를 수 있게 (고른 상태가 빈칸으로 보이지 않도록)
  const intruderOption = () => {
    const f = scale() === 'solar' ? activeFlyby(world()) : undefined
    return f ? [{ value: 'intruder', label: pick(f.name) }] : []
  }
  return (
    <section aria-labelledby="dossier-title" class={styles.block}>
      <h3 id="dossier-title" class={styles.heading}>
        {t('dossier.title')}
      </h3>
      <SelectField
        label={t('dossier.goTo')}
        value={id() ?? ''}
        onChange={(value) => viewActions.select(value || null)}
        options={[
          { value: '', label: '—' },
          ...objectsOf(scale()).map((o) => ({
            value: o.id,
            label: pick(o.name),
          })),
          ...intruderOption(),
        ]}
      />
      <Show when={scale() === 'cosmic'}>
        <CosmicAgeControl />
      </Show>
      <Show when={scale() === 'galaxy'}>
        <p class={styles.small}>{t('galaxy.help')}</p>
      </Show>
      <Show
        when={id()}
        fallback={<p class={styles.small}>{t('dossier.none')}</p>}
      >
        {(current) => (
          <>
            <Switch>
              <Match when={scale() === 'solar' && isBodyId(current())}>
                <BodyDossier id={current() as BodyId} />
              </Match>
              <Match when={scale() === 'solar' && current() === 'intruder'}>
                <IntruderDossier />
              </Match>
              <Match when={scale() === 'stars'}>
                <StarDossier id={current()} />
              </Match>
              <Match when={scale() === 'galaxy'}>
                <GalaxyObjectDossier id={current()} />
              </Match>
              <Match when={scale() === 'local'}>
                <LocalDossier id={current()} />
              </Match>
              <Match when={scale() === 'cosmic'}>
                <CosmicDossier id={current()} />
              </Match>
            </Switch>
            <div class={styles.actions}>
              <Show
                when={focus() === current()}
                fallback={
                  <Button
                    size="sm"
                    onClick={() => viewActions.select(current())}
                  >
                    {t('dossier.follow')}
                  </Button>
                }
              >
                <Button size="sm" onClick={() => viewActions.overview()}>
                  {t('dossier.overview')}
                </Button>
              </Show>
            </div>
          </>
        )}
      </Show>
    </section>
  )
}
