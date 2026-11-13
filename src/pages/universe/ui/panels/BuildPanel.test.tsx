import { render, screen } from '@solidjs/testing-library'
import userEvent from '@testing-library/user-event'
import { initialWorld } from '../../model/world/engine'
import { __setWorldForTest, world } from '../../model/world/store'
import { BuildPanel } from './BuildPanel'

describe('BuildPanel', () => {
  beforeEach(() => __setWorldForTest(initialWorld(2026.87)))

  it('예산 안의 구조물은 짓고, 선행 조건이 없으면 이유를 알린다', async () => {
    render(() => <BuildPanel />)
    await userEvent.click(
      screen.getByRole('button', { name: '우주 기상 경보 위성 짓기' }),
    )
    expect(world().structures.map((s) => s.kind)).toEqual(['sentinel'])
    expect(
      screen.getByRole('button', { name: '화성 테라포밍 짓기' }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: '화성 테라포밍 짓기' }),
    ).toHaveAccessibleDescription(/화성 자기장 방패/)
  })

  it('바로 완공을 켜면 즉시 완공한다', async () => {
    render(() => <BuildPanel />)
    await userEvent.click(screen.getByRole('checkbox', { name: /바로 완공/ }))
    await userEvent.click(
      screen.getByRole('button', { name: '행성 방위 요격망 짓기' }),
    )
    expect(world().structures[0].done).toBe(true)
  })
})
