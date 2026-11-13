import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { ScaleLadder } from './ScaleLadder'

const meta = {
  title: 'universe/ScaleLadder',
  component: ScaleLadder,
} satisfies Meta<typeof ScaleLadder>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
