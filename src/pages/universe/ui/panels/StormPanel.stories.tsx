import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { StormPanel } from './StormPanel'

const meta = {
  title: 'universe/panels/StormPanel',
  component: StormPanel,
} satisfies Meta<typeof StormPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
