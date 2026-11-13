import { fireEvent, render, screen } from '@solidjs/testing-library'
import { RangeField } from './RangeField'

describe('RangeField', () => {
  it('레이블·값 설명·도움말을 연결하고 입력을 숫자로 전달한다', () => {
    const onInput = vi.fn()
    render(() => (
      <RangeField
        label="소행성 지름"
        min={0}
        max={10}
        value={3}
        valueText="340m"
        description="지름이 클수록 에너지가 세제곱으로 커집니다."
        onInput={onInput}
      />
    ))
    const slider = screen.getByRole('slider', { name: '소행성 지름' })
    expect(slider).toHaveAttribute('aria-valuetext', '340m')
    expect(slider).toHaveAccessibleDescription(
      '지름이 클수록 에너지가 세제곱으로 커집니다.',
    )
    fireEvent.input(slider, { target: { value: '7' } })
    expect(onInput).toHaveBeenCalledWith(7)
  })
})
