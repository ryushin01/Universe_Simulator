import { createSignal } from 'solid-js'
import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { ChoiceGroup } from './ChoiceGroup'

const meta = {
  title: 'shared/ChoiceGroup',
  component: ChoiceGroup,
} satisfies Meta<typeof ChoiceGroup>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    legend: '충돌체 종류',
    value: 'stony',
    choices: [],
    onChange: () => {},
  },
  render: () => {
    const [value, setValue] = createSignal('stony')
    return (
      <ChoiceGroup
        legend="충돌체 종류"
        value={value()}
        onChange={setValue}
        columns={3}
        choices={[
          { value: 'stony', label: '암석질', hint: '3,000kg/m³' },
          { value: 'iron', label: '철질', hint: '7,800kg/m³' },
          { value: 'comet', label: '혜성', hint: '초속 50km' },
        ]}
      />
    )
  },
}
