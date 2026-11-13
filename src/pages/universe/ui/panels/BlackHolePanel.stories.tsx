import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { BlackHolePanel } from './BlackHolePanel'

const meta = {
  title: 'universe/panels/BlackHolePanel',
  component: BlackHolePanel,
} satisfies Meta<typeof BlackHolePanel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
