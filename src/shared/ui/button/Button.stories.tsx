import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { Button } from './Button'

const meta = {
  title: 'shared/Button',
  component: Button,
  args: { children: '건설하기' },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: { variant: 'primary', chevron: true, children: '탐사 시작' },
}
export const Ghost: Story = { args: { variant: 'ghost', children: '처음으로' } }
export const Danger: Story = {
  args: { variant: 'danger', children: '충돌 경로에 올리기' },
}
export const Small: Story = { args: { size: 'sm', children: '이동' } }
export const Disabled: Story = {
  args: { variant: 'primary', disabled: true, children: '예산 부족' },
}
