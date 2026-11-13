import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { StatusMessage } from './StatusMessage'

const meta = {
  title: 'shared/StatusMessage',
  component: StatusMessage,
  args: { message: '운동 충돌체 6기를 발사했습니다. 2028년 3월에 닿습니다.' },
} satisfies Meta<typeof StatusMessage>

export default meta
type Story = StoryObj<typeof meta>

export const Info: Story = {}
export const Error: Story = {
  args: { tone: 'error', message: '예산이 모자랍니다. $4.2B가 더 필요합니다.' },
}
