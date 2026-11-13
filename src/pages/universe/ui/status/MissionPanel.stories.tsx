import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { MissionPanel } from './MissionPanel'

const meta = {
  title: 'universe/status/MissionPanel',
  component: MissionPanel,
} satisfies Meta<typeof MissionPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
