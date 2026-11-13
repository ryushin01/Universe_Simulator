import { For, Show, createSignal } from 'solid-js'
import { locale } from '@/shared/i18n'
import { Button, StatusMessage } from '@/shared/ui'
import { formatMoney, formatNumber, formatPercent } from '@/shared/lib'
import {
  CATEGORY_NAME,
  PROJECTS,
  PROJECT_BY_KIND,
} from '../../model/projects/catalog'
import type { ProjectCategory, ProjectKind } from '../../model/projects/catalog'
import { world, worldActions } from '../../model/world/store'
import { canBuild } from '../../model/world/actions'
import {
  isComplete,
  projectCost,
  projectProgress,
} from '../../model/world/selectors'
import { formatPeople } from '../../model/world/text'
import { pick, t } from '../i18n'
import styles from './panels.module.css'

const CATEGORIES: ProjectCategory[] = ['defense', 'habitat', 'climate', 'mega']

function ProjectCard(props: {
  kind: ProjectKind
  instant: boolean
  onResult: (message: string, error: boolean) => void
}) {
  const l = () => locale()
  const spec = () => PROJECT_BY_KIND[props.kind]
  const built = () => world().structures.find((s) => s.kind === props.kind)
  const check = () => canBuild(world(), props.kind)
  const build = () => {
    const result = worldActions.build(props.kind, props.instant)
    props.onResult(pick(result.message), !result.ok)
  }
  return (
    <li class={styles.card}>
      <div class={styles.cardHead}>
        <span class={styles.cardTitle}>{pick(spec().name)}</span>
        <Show when={spec().sf}>
          <span class={styles.tag}>{t('build.sf')}</span>
        </Show>
      </div>
      <p class={styles.small}>{pick(spec().effect)}</p>
      <dl class={styles.preview}>
        <dt>{t('build.site')}</dt>
        <dd>{pick(spec().site)}</dd>
        <dt>{t('build.cost')}</dt>
        <dd>{formatMoney(projectCost(world(), props.kind), l())}</dd>
        <dt>{t('build.time')}</dt>
        <dd>
          {t('common.years', { n: formatNumber(spec().buildYears, l()) })}
        </dd>
        <Show when={spec().population}>
          <dt>{t('build.people')}</dt>
          <dd>{formatPeople(spec().population!, l())}</dd>
        </Show>
        <Show when={spec().requires}>
          <dt>{t('build.requires')}</dt>
          <dd>
            {spec()
              .requires!.map((r) => pick(PROJECT_BY_KIND[r].name))
              .join(', ')}
          </dd>
        </Show>
      </dl>
      <Show
        when={built()}
        fallback={
          <>
            <Button
              size="sm"
              variant="primary"
              disabled={!check().ok}
              aria-label={t('build.button', { name: pick(spec().name) })}
              aria-describedby={!check().ok ? `why-${props.kind}` : undefined}
              onClick={build}
            >
              {t('build.short')}
            </Button>
            <Show when={!check().ok}>
              <p id={`why-${props.kind}`} class={styles.small}>
                {pick(check().message)}
              </p>
            </Show>
          </>
        }
      >
        {(s) => (
          <p class={isComplete(world(), s()) ? styles.good : styles.warn}>
            {isComplete(world(), s())
              ? t('build.done')
              : t('build.building', {
                  percent: formatPercent(projectProgress(world(), s()), l()),
                })}
          </p>
        )}
      </Show>
    </li>
  )
}

/** 거대 우주 구조물과 시설 */
export function BuildPanel() {
  const [instant, setInstant] = createSignal(false)
  const [message, setMessage] = createSignal('')
  const [error, setError] = createSignal(false)
  const inMission = () => world().mission?.status === 'running'
  const onResult = (text: string, failed: boolean) => {
    setMessage(text)
    setError(failed)
  }
  return (
    <div class={styles.panel}>
      <p class={styles.intro}>{t('build.intro')}</p>
      <label class={styles.check}>
        <input
          type="checkbox"
          checked={instant() && !inMission()}
          disabled={inMission()}
          onChange={(e) => setInstant(e.currentTarget.checked)}
        />
        {t('build.instant')}
      </label>
      <StatusMessage message={message()} tone={error() ? 'error' : 'info'} />
      <For each={CATEGORIES}>
        {(category) => (
          <section aria-labelledby={`build-${category}`} class={styles.panel}>
            <h3 id={`build-${category}`} class={styles.caption}>
              {pick(CATEGORY_NAME[category])}
            </h3>
            <ul class={styles.cards}>
              <For each={PROJECTS.filter((p) => p.category === category)}>
                {(p) => (
                  <ProjectCard
                    kind={p.kind}
                    instant={instant() && !inMission()}
                    onResult={onResult}
                  />
                )}
              </For>
            </ul>
          </section>
        )}
      </For>
    </div>
  )
}
