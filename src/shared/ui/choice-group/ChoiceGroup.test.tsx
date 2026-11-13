import { createSignal } from 'solid-js'
import { render, screen } from '@solidjs/testing-library'
import userEvent from '@testing-library/user-event'
import { ChoiceGroup } from './ChoiceGroup'

function Demo() {
  const [value, setValue] = createSignal<'stony' | 'iron' | 'comet'>('stony')
  return (
    <ChoiceGroup
      legend="충돌체 종류"
      value={value()}
      onChange={setValue}
      choices={[
        { value: 'stony', label: '암석질' },
        { value: 'iron', label: '철질' },
        { value: 'comet', label: '혜성', hint: '초속 50km' },
      ]}
    />
  )
}

describe('ChoiceGroup', () => {
  it('fieldset 이름과 라디오 선택을 제공한다', async () => {
    render(() => <Demo />)
    expect(
      screen.getByRole('group', { name: '충돌체 종류' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '암석질' })).toBeChecked()
    await userEvent.click(screen.getByRole('radio', { name: /혜성/ }))
    expect(screen.getByRole('radio', { name: /혜성/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: '암석질' })).not.toBeChecked()
  })
})
