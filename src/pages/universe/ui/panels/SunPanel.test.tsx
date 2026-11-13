import { render, screen } from '@solidjs/testing-library'
import userEvent from '@testing-library/user-event'
import { initialWorld } from '../../model/world/engine'
import { __setWorldForTest } from '../../model/world/store'
import { SunPanel } from './SunPanel'

describe('SunPanel', () => {
  beforeEach(() => __setWorldForTest(initialWorld(2026.87)))

  it('H-R도에 대체 텍스트가 있고 이정표로 이동한다', async () => {
    render(() => <SunPanel />)
    expect(
      screen.getByRole('img', { name: /헤르츠스프룽-러셀 도표/ }),
    ).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', {
        name: '적색 거성 가지 끝 (가장 큼)(으)로 이동',
      }),
    )
    expect(
      screen.getByText('적색 거성', { selector: 'dd' }),
    ).toBeInTheDocument()
  })
})
