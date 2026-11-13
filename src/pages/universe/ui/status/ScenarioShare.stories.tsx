import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { ScenarioShare } from './ScenarioShare'

const meta = {
  title: 'universe/status/ScenarioShare',
  component: ScenarioShare,
} satisfies Meta<typeof ScenarioShare>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
