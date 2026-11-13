import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { PassportCard } from './PassportCard'

const meta = {
  title: 'universe/status/PassportCard',
  component: PassportCard,
  args: {
    title: '화성',
    subtitle: '행성 · 태양에서 1.52 AU',
    image: 'radial-gradient(circle at 38% 35%, #e08a5a, #3a1a10 92%)',
    ring: 0.12,
    ringLabel: '거주 가능도 12%',
    badge: 'LV 3',
    badgeLabel: '탐사 단계: 착륙',
    fields: [
      { label: '질량', value: '0.107 M⊕' },
      { label: '반지름', value: '3,390 km' },
      { label: '표면 중력', value: '3.71 m/s²' },
      { label: '하루 (자전)', value: '24.6시간' },
      { label: '1년 (공전)', value: '1.88년' },
      { label: '평균 기온', value: '−65°C' },
    ],
  },
} satisfies Meta<typeof PassportCard>

export default meta
type Story = StoryObj<typeof meta>

export const Mars: Story = {}
export const Star: Story = {
  args: {
    title: '베텔게우스',
    subtitle: '거성·초거성',
    image: 'radial-gradient(circle at 40% 40%, #fff, #ffb070 50%, #050810 95%)',
    ring: null,
    badge: undefined,
    badgeLabel: undefined,
    ringLabel: undefined,
  },
}
