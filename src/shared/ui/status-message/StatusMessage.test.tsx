import { createSignal } from 'solid-js'
import { render, screen } from '@solidjs/testing-library'
import { StatusMessage } from './StatusMessage'

describe('StatusMessage', () => {
  it('빈 상태로 먼저 두고 내용만 바꾼다', () => {
    const [message, setMessage] = createSignal('')
    render(() => <StatusMessage message={message()} />)
    const status = screen.getByRole('status')
    expect(status).toBeEmptyDOMElement()
    setMessage('달 기지를 짓기 시작했습니다.')
    expect(screen.getByRole('status')).toBe(status)
    expect(status).toHaveTextContent('달 기지를 짓기 시작했습니다.')
  })
})
