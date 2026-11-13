import { createSignal } from 'solid-js'
import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { ToggleButton } from './ToggleButton'

const meta = {
  title: 'shared/ToggleButton',
  component: ToggleButton,
} satisfies Meta<typeof ToggleButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { pressed: true, onToggle: () => {}, children: '궤도' },
  render: () => {
    const [orbits, setOrbits] = createSignal(true)
    const [labels, setLabels] = createSignal(false)
    return (
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <ToggleButton pressed={orbits()} onToggle={setOrbits}>
          궤도
        </ToggleButton>
        <ToggleButton pressed={labels()} onToggle={setLabels}>
          이름
        </ToggleButton>
      </div>
    )
  },
}
