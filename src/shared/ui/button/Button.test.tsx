import { render, screen } from '@solidjs/testing-library'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button', () => {
  it('기본 type은 button이고 클릭을 전달한다', async () => {
    const onClick = vi.fn()
    render(() => <Button onClick={onClick}>발사</Button>)
    const button = screen.getByRole('button', { name: '발사' })
    expect(button).toHaveAttribute('type', 'button')
    await userEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('» 표시는 보조기기에서 읽지 않는다', () => {
    render(() => <Button chevron>탐사 시작</Button>)
    expect(screen.getByRole('button', { name: '탐사 시작' })).toBeVisible()
  })

  it('비활성 상태에서는 클릭을 보내지 않는다', async () => {
    const onClick = vi.fn()
    render(() => (
      <Button disabled onClick={onClick}>
        예산 부족
      </Button>
    ))
    await userEvent.click(screen.getByRole('button', { name: '예산 부족' }))
    expect(onClick).not.toHaveBeenCalled()
  })
})
