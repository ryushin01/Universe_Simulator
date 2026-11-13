import { createSignal } from 'solid-js'
import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { RangeField } from './RangeField'

const meta = {
  title: 'shared/RangeField',
  component: RangeField,
} satisfies Meta<typeof RangeField>

export default meta
type Story = StoryObj<typeof meta>

const SPEEDS = ['1시간', '1일', '1주', '1개월', '1년', '10년', '100년']

export const Default: Story = {
  args: {
    label: '시간 속도 (화면 1초마다)',
    min: 0,
    max: SPEEDS.length - 1,
    value: 1,
    valueText: '1일',
    onInput: () => {},
  },
  render: () => {
    const [value, setValue] = createSignal(1)
    return (
      <RangeField
        label="시간 속도 (화면 1초마다)"
        min={0}
        max={SPEEDS.length - 1}
        value={value()}
        valueText={SPEEDS[value()]}
        description="1년/초보다 빠르면 행성 위치를 고정합니다."
        onInput={setValue}
      />
    )
  },
}
