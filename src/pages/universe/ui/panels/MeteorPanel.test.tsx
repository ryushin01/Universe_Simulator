import { render, screen, within } from '@solidjs/testing-library'
import userEvent from '@testing-library/user-event'
import { dateToYear } from '@/shared/lib'
import { initialWorld } from '../../model/world/engine'
import { __setWorldForTest, world } from '../../model/world/store'
import { MeteorPanel } from './MeteorPanel'

describe('MeteorPanel', () => {
  beforeEach(() =>
    __setWorldForTest(
      initialWorld(dateToYear(new Date('2026-11-13T00:00:00Z'))),
    ),
  )

  it('유성우 표에 다음 극대와 모천체를 보여 준다', () => {
    render(() => <MeteorPanel />)
    const table = screen.getByRole('table', { name: /주요 유성우/ })
    const leonids = within(table).getByRole('rowheader', {
      name: /사자자리 유성우/,
    })
    expect(leonids).toHaveTextContent('템펠-터틀')
    expect(leonids.closest('tr')).toHaveTextContent('2026.11.17')
  })

  it('극대 전날로 이동하고 유성 폭풍을 예약한다', async () => {
    const user = userEvent.setup()
    render(() => <MeteorPanel />)
    await user.click(
      screen.getByRole('button', { name: '사자자리 유성우 극대 전날로 이동' }),
    )
    expect(world().speedIndex).toBe(0)
    await user.click(
      screen.getByRole('button', { name: '사자자리 유성우 유성 폭풍 만들기' }),
    )
    expect(world().meteorStorm?.showerId).toBe('leonids')
  })
})
