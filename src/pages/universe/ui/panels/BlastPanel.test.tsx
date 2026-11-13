import { render, screen } from '@solidjs/testing-library'
import userEvent from '@testing-library/user-event'
import { setLocale } from '@/shared/i18n'
import { initialWorld } from '../../model/world/engine'
import { __setWorldForTest, world } from '../../model/world/store'
import { BlastPanel } from './BlastPanel'

describe('BlastPanel', () => {
  beforeEach(() => __setWorldForTest(initialWorld(2026.87)))

  it('실제 천체와 가정을 구분하고, 한 번 터진 실제 별은 다시 터지지 않는다', async () => {
    render(() => <BlastPanel />)
    expect(screen.getByText('실제 천체')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '폭발시키기' }))
    expect(world().blasts).toHaveLength(1)
    expect(screen.getByRole('button', { name: '이미 폭발함' })).toBeDisabled()
  })

  it('가까운 초신성은 오존층 감소와 잔해 도착을 미리 보여 준다', async () => {
    render(() => <BlastPanel />)
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: '폭발할 천체' }),
      'near-10',
    )
    expect(screen.getByText('가정')).toBeInTheDocument()
    expect(screen.getByText('잔해 도착')).toBeInTheDocument()
  })

  it('결과 안내문은 언어를 바꾸면 그 언어로 다시 나온다', async () => {
    render(() => <BlastPanel />)
    await userEvent.click(screen.getByRole('button', { name: '폭발시키기' }))
    expect(screen.getByRole('status')).toHaveTextContent(/베텔게우스/)
    setLocale('en')
    try {
      expect(screen.getByRole('status')).toHaveTextContent(/Betelgeuse/)
    } finally {
      setLocale('ko')
    }
  })
})
