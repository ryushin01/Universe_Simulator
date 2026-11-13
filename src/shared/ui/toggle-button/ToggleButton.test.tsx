import { createSignal } from 'solid-js'
import { render, screen } from '@solidjs/testing-library'
import userEvent from '@testing-library/user-event'
import { ToggleButton } from './ToggleButton'

describe('ToggleButton', () => {
  it('눌림 상태를 aria-pressed로 알리고 글자는 그대로 둔다', async () => {
    const [on, setOn] = createSignal(true)
    render(() => (
      <ToggleButton pressed={on()} onToggle={setOn}>
        궤도
      </ToggleButton>
    ))
    const button = screen.getByRole('button', { name: '궤도' })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(button)
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(button).toHaveTextContent('궤도')
  })
})
