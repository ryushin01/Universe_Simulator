import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { ImpactPanel } from './ImpactPanel'

const meta = {
  title: 'universe/panels/ImpactPanel',
  component: ImpactPanel,
} satisfies Meta<typeof ImpactPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
