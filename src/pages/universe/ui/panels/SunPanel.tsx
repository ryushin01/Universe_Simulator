import { For, createSignal } from 'solid-js'
import { locale } from '@/shared/i18n'
import { Button, StatusMessage } from '@/shared/ui'
import { formatSig, formatYears } from '@/shared/lib'
import {
  SUN_MILESTONES,
  sunAgeGyr,
  sunAt,
  yearAtSunAge,
} from '../../model/solar/sun'
import { world, worldActions } from '../../model/world/store'
import { sunState } from '../../model/world/selectors'
import { pick, t } from '../i18n'
import type { MessageKey } from '../i18n'
import styles from './panels.module.css'

// H-R도 좌표: 가로 log T (40,000K 왼쪽 → 2,000K 오른쪽), 세로 log L (10⁻⁵ ~ 10⁴)
const W = 320
const H = 220
const x = (temperature: number) =>
  ((Math.log10(40_000) - Math.log10(Math.max(temperature, 1000))) /
    (Math.log10(40_000) - Math.log10(2000))) *
    (W - 40) +
  30
const y = (luminosity: number) =>
  H - 24 - ((Math.log10(Math.max(luminosity, 1e-5)) + 5) / 9) * (H - 40)

/** 태양 진화 경로 (나이마다 표본) */
const TRACK = (() => {
  const ages: number[] = []
  for (let a = 0; a <= 10.9; a += 0.4) ages.push(a)
  for (let a = 10.9; a <= 12.167; a += 0.02) ages.push(a)
  ages.push(
    12.1675,
    12.2,
    12.27,
    12.3,
    12.33,
    12.355,
    12.365,
    12.3651,
    12.366,
    12.367,
    12.4,
    13,
    15,
    20,
  )
  return ages
    .map((a) => sunAt(a))
    .map((s) => `${x(s.temperature).toFixed(1)},${y(s.luminosity).toFixed(1)}`)
    .join(' ')
})()

const REFERENCE = [
  { name: ['시리우스', 'Sirius'], t: 9940, l: 25.4 },
  { name: ['베텔게우스', 'Betelgeuse'], t: 3600, l: 100_000 },
  { name: ['프록시마', 'Proxima'], t: 3042, l: 0.0017 },
  { name: ['시리우스 B', 'Sirius B'], t: 25_000, l: 0.056 },
]

/** 태양의 진화: 지금 상태, 이정표로 이동, H-R도 */
export function SunPanel() {
  const [message, setMessage] = createSignal('')
  const l = () => locale()
  const sun = () => sunState(world())
  const age = () => sunAgeGyr(world().year)
  const stageName = () =>
    sun().blackHole
      ? t('stage.blackHole')
      : t(`stage.${sun().stage}` as MessageKey)

  const go = (ageGyr: number) => {
    const result = worldActions.jumpTo(yearAtSunAge(ageGyr))
    setMessage(pick(result.message))
  }

  return (
    <div class={styles.panel}>
      <p class={styles.intro}>{t('sun.intro')}</p>
      <dl class={styles.preview}>
        <dt>{t('sun.now')}</dt>
        <dd>{stageName()}</dd>
        <dt>{t('status.luminosity')}</dt>
        <dd>{`${formatSig(sun().luminosity, l(), 3)} L☉`}</dd>
        <dt>{t('status.radius')}</dt>
        <dd>{`${formatSig(sun().radius, l(), 3)} R☉`}</dd>
      </dl>
      <figure>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          class={styles.hr}
          role="img"
          aria-label={t('sun.hrLabel', { stage: stageName() })}
        >
          <rect
            x="30"
            y="16"
            width={W - 40}
            height={H - 40}
            fill="none"
            stroke="rgb(150 172 240 / 0.25)"
          />
          <polyline
            points={TRACK}
            fill="none"
            stroke="#ffd27a"
            stroke-width="1.5"
            opacity="0.85"
          />
          <For each={REFERENCE}>
            {(star) => (
              <g>
                <circle cx={x(star.t)} cy={y(star.l)} r="2.5" fill="#a6b3d9" />
                <text
                  x={x(star.t) + 5}
                  y={y(star.l) + 3}
                  font-size="9"
                  fill="#a6b3d9"
                >
                  {star.name[l() === 'en' ? 1 : 0]}
                </text>
              </g>
            )}
          </For>
          <circle
            cx={x(sunAt(age()).temperature)}
            cy={y(sunAt(age()).luminosity)}
            r="5"
            fill="#ff9a52"
            stroke="#fff"
            stroke-width="1.5"
          />
          <text
            x={W / 2 + 15}
            y={H - 6}
            font-size="9"
            fill="#a6b3d9"
            text-anchor="middle"
          >
            {t('sun.temperatureAxis')} ← 40,000 · 2,000 →
          </text>
          <text
            x="10"
            y={H / 2}
            font-size="9"
            fill="#a6b3d9"
            text-anchor="middle"
            transform={`rotate(-90 10 ${H / 2})`}
          >
            {t('sun.luminosityAxis')}
          </text>
        </svg>
        <figcaption class={styles.small}>{t('sun.hr')}</figcaption>
      </figure>
      <div
        class={styles.tableWrap}
        tabIndex={0}
        role="region"
        aria-labelledby="sun-caption"
      >
        <table class={styles.table}>
          <caption id="sun-caption">{t('sun.milestones')}</caption>
          <tbody>
            <For each={SUN_MILESTONES}>
              {(m) => {
                const state = sunAt(m.ageGyr)
                const ahead = () => (m.ageGyr - age()) * 1e9
                return (
                  <tr>
                    <th scope="row">{t(`milestone.${m.id}` as MessageKey)}</th>
                    <td>
                      {m.id === 'now'
                        ? '—'
                        : formatYears(
                            Number(Math.max(0, ahead()).toPrecision(3)),
                            l(),
                          )}
                    </td>
                    <td>{`${formatSig(state.luminosity, l(), 2)} L☉`}</td>
                    <td>
                      <Button
                        size="sm"
                        disabled={m.ageGyr <= age() + 1e-9}
                        aria-label={t('sun.goNamed', {
                          name: t(`milestone.${m.id}` as MessageKey),
                        })}
                        onClick={() => go(m.ageGyr)}
                      >
                        {t('sun.go')}
                      </Button>
                    </td>
                  </tr>
                )
              }}
            </For>
          </tbody>
        </table>
      </div>
      <StatusMessage message={message()} />
    </div>
  )
}
