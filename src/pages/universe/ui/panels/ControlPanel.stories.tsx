import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { ControlPanel } from './ControlPanel'

const meta = {
  title: 'universe/panels/ControlPanel',
  component: ControlPanel,
} satisfies Meta<typeof ControlPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
