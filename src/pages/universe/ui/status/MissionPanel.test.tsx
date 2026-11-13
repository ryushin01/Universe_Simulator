import { render, screen } from '@solidjs/testing-library'
import userEvent from '@testing-library/user-event'
import { initialWorld } from '../../model/world/engine'
import { __setWorldForTest, world } from '../../model/world/store'
import { MissionPanel } from './MissionPanel'

describe('MissionPanel', () => {
  beforeEach(() => {
    __setWorldForTest(initialWorld(2026.87))
    HTMLDialogElement.prototype.showModal ??= function (
      this: HTMLDialogElement,
    ) {
      this.open = true
    }
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
      this.open = false
    }
  })

  it('미션을 시작하면 목표와 남은 시간을 보여 준다', async () => {
    render(() => <MissionPanel />)
    const starts = screen.getAllByRole('button', { name: /시작/ })
    await userEvent.click(starts[0])
    expect(world().mission?.id).toBe('deflect')
    expect(world().impacts[0].designation).toBe('2026 PDC')
    expect(screen.getByText('남은 시간')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '미션 그만두기' }))
    expect(world().mission).toBeNull()
  })
})
