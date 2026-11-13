import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { BuildPanel } from './BuildPanel'

const meta = {
  title: 'universe/panels/BuildPanel',
  component: BuildPanel,
} satisfies Meta<typeof BuildPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
