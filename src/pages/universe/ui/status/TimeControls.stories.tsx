import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { TimeControls } from './TimeControls'

const meta = {
  title: 'universe/status/TimeControls',
  component: TimeControls,
} satisfies Meta<typeof TimeControls>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
