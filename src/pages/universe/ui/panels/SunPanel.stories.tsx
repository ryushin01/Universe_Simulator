import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { SunPanel } from './SunPanel'

const meta = {
  title: 'universe/panels/SunPanel',
  component: SunPanel,
} satisfies Meta<typeof SunPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
