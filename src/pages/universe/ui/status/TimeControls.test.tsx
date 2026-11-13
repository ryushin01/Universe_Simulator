import { fireEvent, render, screen } from '@solidjs/testing-library'
import userEvent from '@testing-library/user-event'
import { initialWorld } from '../../model/world/engine'
import { __setWorldForTest, world } from '../../model/world/store'
import { TimeControls } from './TimeControls'

describe('TimeControls', () => {
  beforeEach(() => __setWorldForTest(initialWorld(2026.87)))

  it('재생 버튼의 이름이 상태에 따라 바뀐다', async () => {
    render(() => <TimeControls />)
    await userEvent.click(
      screen.getByRole('button', { name: '시간 흐름 재생' }),
    )
    expect(world().running).toBe(true)
    expect(
      screen.getByRole('button', { name: '시간 흐름 멈춤' }),
    ).toBeInTheDocument()
  })

  it('속도를 바꾸면 값 설명과 행성 고정 안내가 바뀐다', () => {
    render(() => <TimeControls />)
    const slider = screen.getByRole('slider', {
      name: '시간 속도 (화면 1초마다)',
    })
    expect(slider).toHaveAttribute('aria-valuetext', '1일')
    fireEvent.input(slider, { target: { value: '8' } })
    expect(slider).toHaveAttribute('aria-valuetext', '100만 년')
    expect(slider).toHaveAccessibleDescription(/행성 위치를 멈추고/)
  })

  it('먼 미래의 날짜는 몇 년 후로 보여 준다', () => {
    __setWorldForTest(initialWorld(2026 + 1.2e9))
    render(() => <TimeControls />)
    expect(screen.getByText(/12억년 후/)).toBeInTheDocument()
  })
})
