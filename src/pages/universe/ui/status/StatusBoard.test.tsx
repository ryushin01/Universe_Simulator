import { render, screen } from '@solidjs/testing-library'
import { initialWorld } from '../../model/world/engine'
import { jumpTo } from '../../model/world/actions'
import { yearAtSunAge } from '../../model/solar/sun'
import { __setWorldForTest } from '../../model/world/store'
import { StatusBoard } from './StatusBoard'

describe('StatusBoard', () => {
  it('오늘은 주계열성 태양과 거주 가능한 지구, 카르다쇼프 약 0.73', () => {
    __setWorldForTest(initialWorld(2026.87))
    render(() => <StatusBoard />)
    expect(screen.getByText('주계열성')).toBeInTheDocument()
    expect(screen.getByText('거주 가능')).toBeInTheDocument()
    expect(screen.getByText('0.73')).toBeInTheDocument()
  })

  it('적색 거성 태양이 지구를 삼키면 지구가 없다고 알린다', () => {
    __setWorldForTest(jumpTo(initialWorld(2026.87), yearAtSunAge(12.2)).state)
    render(() => <StatusBoard />)
    expect(screen.getByText('없음')).toBeInTheDocument()
    expect(screen.getByText(/헬륨을 태우는 거성/)).toBeInTheDocument()
  })
})
