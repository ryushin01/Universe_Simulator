import { render, screen } from '@solidjs/testing-library'
import userEvent from '@testing-library/user-event'
import { initialWorld } from '../../model/world/engine'
import { makeStorm } from '../../model/world/factory'
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

  it('다른 행성을 겨눠도 원뿔 안에 지구가 들면 지구 도착과 피해를 보여 준다', async () => {
    render(() => <StormPanel />)
    const select = screen.getByRole('combobox', { name: '퍼지는 방향' })
    for (const target of ['mars', 'jupiter', 'saturn'] as const) {
      await userEvent.selectOptions(select, target)
      const hitsEarth = makeStorm(world(), 'carrington', target).hits.some(
        (h) => h.body === 'earth',
      )
      if (hitsEarth) expect(screen.getByText('$2T')).toBeInTheDocument()
      else expect(screen.getByText('지구를 비껴 감')).toBeInTheDocument()
    }
  })
})
