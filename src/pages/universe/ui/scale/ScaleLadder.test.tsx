import { render, screen } from '@solidjs/testing-library'
import userEvent from '@testing-library/user-event'
import { scale, viewActions } from '../../model/view'
import { ScaleLadder } from './ScaleLadder'

describe('ScaleLadder', () => {
  beforeEach(() => viewActions.setScale('solar'))

  it('다섯 규모를 라디오로 고르고 지금 규모를 표시한다', async () => {
    render(() => <ScaleLadder />)
    expect(screen.getByRole('group', { name: '보는 규모' })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(5)
    expect(screen.getByRole('radio', { name: /태양계/ })).toBeChecked()
    await userEvent.click(screen.getByRole('radio', { name: /우리 은하/ }))
    expect(scale()).toBe('galaxy')
    expect(screen.getByRole('radio', { name: /우리 은하/ })).toBeChecked()
  })
})
