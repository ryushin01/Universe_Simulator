import { createSignal } from 'solid-js'
import { render, screen } from '@solidjs/testing-library'
import userEvent from '@testing-library/user-event'
import { Tabs } from './Tabs'

function Demo() {
  const [value, setValue] = createSignal('a')
  return (
    <Tabs
      label="테스트"
      value={value()}
      onChange={setValue}
      items={[
        { id: 'a', label: '가', content: <p>가 내용</p> },
        { id: 'b', label: '나', content: <p>나 내용</p> },
        { id: 'c', label: '다', content: <p>다 내용</p> },
      ]}
    />
  )
}

describe('Tabs', () => {
  it('선택 상태(true/false)와 패널 연결을 표시한다', () => {
    render(() => <Demo />)
    expect(screen.getByRole('tab', { name: '가' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: '나' })).toHaveAttribute(
      'aria-selected',
      'false',
    )
    expect(screen.getByRole('tabpanel', { name: '가' })).toHaveTextContent(
      '가 내용',
    )
    // 보이지 않는 패널은 hidden
    expect(
      screen.getByText('나 내용').closest('[role=tabpanel]'),
    ).toHaveAttribute('hidden')
  })

  it('화살표·Home·End로 이동하고 roving tabindex를 유지한다', async () => {
    const user = userEvent.setup()
    render(() => <Demo />)
    await user.tab()
    expect(screen.getByRole('tab', { name: '가' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: '나' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: '나' })).toHaveAttribute(
      'tabindex',
      '0',
    )
    expect(screen.getByRole('tab', { name: '가' })).toHaveAttribute(
      'tabindex',
      '-1',
    )
    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { name: '다' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: '가' })).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: '다' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(
      screen.getByText('다 내용').closest('[role=tabpanel]'),
    ).not.toHaveAttribute('hidden')
  })
})
