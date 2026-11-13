import { render, screen } from '@solidjs/testing-library'
import userEvent from '@testing-library/user-event'
import { initialWorld } from '../../model/world/engine'
import { focus } from '../../model/view'
import { __setWorldForTest, world } from '../../model/world/store'
import { BlackHolePanel } from './BlackHolePanel'

describe('BlackHolePanel', () => {
  beforeEach(() => __setWorldForTest(initialWorld(2026.87)))

  it('사고 실험 버튼은 상태에 따라 이름이 바뀐다', async () => {
    render(() => <BlackHolePanel />)
    await userEvent.click(
      screen.getByRole('button', { name: '태양을 블랙홀로 바꾸기' }),
    )
    expect(world().sunBlackHole).toBe(true)
    await userEvent.click(screen.getByRole('button', { name: '태양 되돌리기' }))
    expect(world().sunBlackHole).toBe(false)
  })

  it('글리제 710은 너무 멀어 혜성 소나기만 일으킨다', async () => {
    render(() => <BlackHolePanel />)
    await userEvent.click(screen.getByRole('radio', { name: /글리제 710/ }))
    expect(screen.getByText(/혜성 소나기만/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '다가오게 하기' }))
    expect(world().flybys[0].closestYear - world().year).toBeCloseTo(1.29e6, -3)
  })

  it('직접 정하기에서는 거리·속도·각도를 조절한다', async () => {
    render(() => <BlackHolePanel />)
    await userEvent.click(screen.getByRole('radio', { name: '직접 정하기' }))
    expect(
      screen.getByRole('slider', { name: '가장 가까울 때 거리' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: '속도' })).toBeInTheDocument()
  })

  it('다가오기 시작하면 카메라로 따라갈 수 있다', async () => {
    render(() => <BlackHolePanel />)
    expect(
      screen.queryByRole('button', { name: '다가오는 천체 따라가기' }),
    ).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '다가오게 하기' }))
    await userEvent.click(
      screen.getByRole('button', { name: '다가오는 천체 따라가기' }),
    )
    expect(focus()).toBe('intruder')
  })
})
