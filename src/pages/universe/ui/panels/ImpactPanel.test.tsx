import { render, screen, within } from '@solidjs/testing-library'
import userEvent from '@testing-library/user-event'
import { initialWorld } from '../../model/world/engine'
import { __setWorldForTest, world } from '../../model/world/store'
import { ImpactPanel } from './ImpactPanel'

describe('ImpactPanel', () => {
  beforeEach(() => __setWorldForTest({ ...initialWorld(2026.87), budget: 100 }))

  it('예시를 고르면 예상 결과를 미리 보여 준다', async () => {
    render(() => <ImpactPanel />)
    await userEvent.click(screen.getByRole('button', { name: '칙술루브급' }))
    expect(screen.getByRole('slider', { name: '지름' })).toHaveAttribute(
      'aria-valuetext',
      '10 km',
    )
    expect(screen.getByText('대멸종')).toBeInTheDocument()
  })

  it('충돌 궤도에 올린 뒤 편향 임무를 보낸다', async () => {
    const user = userEvent.setup()
    render(() => <ImpactPanel />)
    await user.click(screen.getByRole('button', { name: '충돌 궤도에 올리기' }))
    expect(world().impacts).toHaveLength(1)
    const card = screen.getByRole('listitem')
    expect(within(card).getByText(/뒤 지구 충돌/)).toBeInTheDocument()
    await user.click(
      within(card).getByRole('button', { name: '편향 임무 보내기' }),
    )
    expect(world().impacts[0].missions).toHaveLength(1)
    // 상태가 바뀌어도 카드와 결과 메시지가 남아 있음
    expect(
      within(screen.getByRole('listitem')).getByRole('status'),
    ).toHaveTextContent(/운동 충돌체 5기를 보냈습니다/)
  })
})
