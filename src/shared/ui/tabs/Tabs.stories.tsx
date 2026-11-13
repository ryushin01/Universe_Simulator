import { createSignal } from 'solid-js'
import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { Tabs } from './Tabs'

const meta = {
  title: 'shared/Tabs',
  component: Tabs,
} satisfies Meta<typeof Tabs>

export default meta
type Story = StoryObj<typeof meta>

const ITEMS = [
  '충돌',
  '태양 폭풍',
  '별 폭발',
  '블랙홀',
  '유성우',
  '태양의 미래',
  '건설',
]

export const Default: Story = {
  args: {
    label: '우주 관리 항목',
    value: '충돌',
    items: [],
    onChange: () => {},
  },
  render: () => {
    const [value, setValue] = createSignal(ITEMS[0])
    return (
      <Tabs
        label="우주 관리 항목"
        value={value()}
        onChange={setValue}
        items={ITEMS.map((label) => ({
          id: label,
          label,
          content: <p>{label} 설정</p>,
        }))}
      />
    )
  },
}
