import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { MeteorPanel } from './MeteorPanel'

const meta = {
  title: 'universe/panels/MeteorPanel',
  component: MeteorPanel,
} satisfies Meta<typeof MeteorPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
