import { render, screen } from '@solidjs/testing-library'
import userEvent from '@testing-library/user-event'
import { initialWorld } from '../../model/world/engine'
import { build, launchImpact } from '../../model/world/actions'
import { __setWorldForTest } from '../../model/world/store'
import { ScenarioShare } from './ScenarioShare'

describe('ScenarioShare', () => {
  beforeEach(() => {
    window.localStorage.clear()
    __setWorldForTest(build(initialWorld(2026.87), 'sentinel', true).state)
  })

  it('이름 붙여 저장하고 불러오고 지운다', async () => {
    const user = userEvent.setup()
    render(() => <ScenarioShare />)
    await user.click(screen.getByText('공유·저장'))
    await user.type(
      screen.getByRole('textbox', { name: '저장 이름' }),
      '경보 위성',
    )
    await user.click(screen.getByRole('button', { name: '저장' }))
    expect(screen.getByRole('status')).toHaveTextContent(
      '‘경보 위성’(으)로 저장했습니다.',
    )
    await user.click(screen.getByRole('button', { name: '경보 위성 불러오기' }))
    expect(screen.getByRole('status')).toHaveTextContent('불러왔습니다')
    await user.click(screen.getByRole('button', { name: '경보 위성 지우기' }))
    expect(
      screen.queryByRole('button', { name: '경보 위성 불러오기' }),
    ).not.toBeInTheDocument()
  })

  it('다가오는 소행성처럼 진행 중인 사건이 있으면 이유를 알리고 저장·공유를 막는다', async () => {
    const user = userEvent.setup()
    __setWorldForTest(
      launchImpact(initialWorld(2026.87), {
        target: 'earth',
        kind: 'stony',
        diameterM: 300,
        warningYears: 5,
      }).state,
    )
    render(() => <ScenarioShare />)
    await user.click(screen.getByText('공유·저장'))
    const save = screen.getByRole('button', { name: '저장' })
    const copy = screen.getByRole('button', { name: '공유 링크 복사' })
    expect(save).toBeDisabled()
    expect(copy).toBeDisabled()
    expect(save).toHaveAccessibleDescription(
      /진행 중인 사건은 저장할 수 없습니다/,
    )
  })
})
