import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { BlastPanel } from './BlastPanel'

const meta = {
  title: 'universe/panels/BlastPanel',
  component: BlastPanel,
} satisfies Meta<typeof BlastPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
