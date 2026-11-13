import { createSignal } from 'solid-js'
import { Tabs } from '@/shared/ui'
import { t } from '../i18n'
import { ImpactPanel } from './ImpactPanel'
import { StormPanel } from './StormPanel'
import { BlastPanel } from './BlastPanel'
import { BlackHolePanel } from './BlackHolePanel'
import { MeteorPanel } from './MeteorPanel'
import { SunPanel } from './SunPanel'
import { BuildPanel } from './BuildPanel'

/** 우주 관리: 재해를 일으키고 구조물로 대응 */
export function ControlPanel() {
  const [tab, setTab] = createSignal('impact')
  return (
    <Tabs
      label={t('tabs.label')}
      value={tab()}
      onChange={setTab}
      columns={4}
      items={[
        { id: 'impact', label: t('tabs.impact'), content: <ImpactPanel /> },
        { id: 'storm', label: t('tabs.storm'), content: <StormPanel /> },
        { id: 'blast', label: t('tabs.blast'), content: <BlastPanel /> },
        { id: 'hole', label: t('tabs.hole'), content: <BlackHolePanel /> },
        { id: 'meteor', label: t('tabs.meteor'), content: <MeteorPanel /> },
        { id: 'sun', label: t('tabs.sun'), content: <SunPanel /> },
        { id: 'build', label: t('tabs.build'), content: <BuildPanel /> },
      ]}
    />
  )
}
