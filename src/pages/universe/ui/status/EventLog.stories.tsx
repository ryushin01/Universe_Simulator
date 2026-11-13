import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { EventLog } from './EventLog'

const meta = {
  title: 'universe/status/EventLog',
  component: EventLog,
} satisfies Meta<typeof EventLog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
