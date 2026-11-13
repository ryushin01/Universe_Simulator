import { render, screen } from '@solidjs/testing-library'
import userEvent from '@testing-library/user-event'
import { initialWorld } from '../../model/world/engine'
import { __setWorldForTest, world } from '../../model/world/store'
import { StormPanel } from './StormPanel'

describe('StormPanel', () => {
  beforeEach(() => __setWorldForTest(initialWorld(2026.87)))

  it('캐링턴급 폭풍은 약 17시간 뒤 지구에 닿고 대비가 없으면 $2T 피해', async () => {
    render(() => <StormPanel />)
    expect(screen.getByText('17시간')).toBeInTheDocument()
    expect(screen.getByText('$2T')).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: '코로나 질량 방출 일으키기' }),
    )
    expect(world().storms).toHaveLength(1)
    expect(screen.getByRole('status')).toHaveTextContent(
      /약 17시간 뒤 지구에 닿습니다/,
    )
  })
})
