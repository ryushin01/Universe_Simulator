import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { IntroRings } from './IntroRings'

const meta = {
  title: 'universe/IntroRings',
  component: IntroRings,
} satisfies Meta<typeof IntroRings>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
