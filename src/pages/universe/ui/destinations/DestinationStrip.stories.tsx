import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { DestinationStrip } from './DestinationStrip'

const meta = {
  title: 'universe/DestinationStrip',
  component: DestinationStrip,
} satisfies Meta<typeof DestinationStrip>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
