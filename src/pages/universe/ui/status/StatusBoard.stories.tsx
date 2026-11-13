import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { StatusBoard } from './StatusBoard'

const meta = {
  title: 'universe/status/StatusBoard',
  component: StatusBoard,
} satisfies Meta<typeof StatusBoard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
