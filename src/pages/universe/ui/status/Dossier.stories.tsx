import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { FLYBY_PRESETS } from '../../model/hazards/flyby'
import { initialWorld } from '../../model/world/engine'
import { __setWorldForTest, worldActions } from '../../model/world/store'
import { viewActions } from '../../model/view'
import { Dossier } from './Dossier'

const meta = {
  title: 'universe/status/Dossier',
  component: Dossier,
} satisfies Meta<typeof Dossier>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  beforeEach: () => {
    __setWorldForTest(initialWorld(2026.87))
    viewActions.setScale('solar')
    viewActions.select('earth', false)
  },
}

/** 블랙홀 탭에서 다가오게 한 항성 블랙홀을 고른 모습 */
export const PassingBlackHole: Story = {
  beforeEach: () => {
    __setWorldForTest(initialWorld(2026.87))
    const preset = FLYBY_PRESETS.find((f) => f.id === 'black-hole')!
    worldActions.launchFlyby({ ...preset, presetId: preset.id })
    viewActions.setScale('solar')
    viewActions.select('intruder', false)
  },
}
