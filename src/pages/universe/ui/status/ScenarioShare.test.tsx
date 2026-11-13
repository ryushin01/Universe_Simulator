import { render, screen } from '@solidjs/testing-library'
import userEvent from '@testing-library/user-event'
import { initialWorld } from '../../model/world/engine'
import { build } from '../../model/world/actions'
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
})
