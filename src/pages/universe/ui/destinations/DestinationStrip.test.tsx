import { render, screen } from '@solidjs/testing-library'
import userEvent from '@testing-library/user-event'
import { focus, selection, viewActions } from '../../model/view'
import { DestinationStrip } from './DestinationStrip'

describe('DestinationStrip', () => {
  beforeEach(() => viewActions.setScale('solar'))

  it('지금 규모의 목적지를 고르면 선택하고 카메라가 따라간다', async () => {
    render(() => <DestinationStrip />)
    expect(
      screen.getByRole('group', { name: '태양계' }),
    ).toHaveAccessibleDescription('목적지를 고르세요')
    await userEvent.click(screen.getByRole('radio', { name: '화성' }))
    expect(selection().solar).toBe('mars')
    expect(focus()).toBe('mars')
  })

  it('규모를 바꾸면 그 규모의 목적지로 바뀐다', () => {
    viewActions.setScale('stars')
    render(() => <DestinationStrip />)
    expect(
      screen.getByRole('radio', { name: '베텔게우스' }),
    ).toBeInTheDocument()
  })
})
