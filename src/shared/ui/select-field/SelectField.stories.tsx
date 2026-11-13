import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { SelectField } from './SelectField'

const meta = {
  title: 'shared/SelectField',
  component: SelectField,
  args: {
    label: '충돌할 천체',
    value: 'earth',
    onChange: () => {},
    description: '가스 행성에는 크레이터 대신 대기 흔적이 남습니다.',
    options: [
      { value: 'earth', label: '지구', group: '행성' },
      { value: 'mars', label: '화성', group: '행성' },
      { value: 'jupiter', label: '목성', group: '행성' },
      { value: 'moon', label: '달', group: '위성' },
    ],
  },
} satisfies Meta<typeof SelectField>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
