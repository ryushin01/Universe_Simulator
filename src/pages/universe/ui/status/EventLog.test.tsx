import { render, screen } from '@solidjs/testing-library'
import { both } from '@/shared/i18n'
import { initialWorld, log } from '../../model/world/engine'
import { __setWorldForTest } from '../../model/world/store'
import { EventLog } from './EventLog'

describe('EventLog', () => {
  it('비어 있으면 안내를, 사건은 최근 것부터 상태 글자와 함께 보여 준다', () => {
    __setWorldForTest(initialWorld(2026.87))
    render(() => <EventLog />)
    expect(screen.getByText(/아직 사건이 없습니다/)).toBeInTheDocument()
    let state = initialWorld(2026.87)
    state = log(state, both('첫 사건', 'first'), 'info')
    state = log(state, both('지구 충돌', 'impact'), 'danger')
    __setWorldForTest(state)
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('경보')
    expect(items[0]).toHaveTextContent('지구 충돌')
    expect(items[1]).toHaveTextContent('알림')
  })
})
