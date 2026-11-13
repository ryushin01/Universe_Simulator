import { render, screen } from '@solidjs/testing-library'
import { PassportCard } from './PassportCard'

describe('PassportCard', () => {
  it('항목을 설명 목록(dt·dd)으로 제공하고 장식 선은 숨긴다', () => {
    const { container } = render(() => (
      <PassportCard
        title="화성"
        subtitle="행성"
        image="#c8653d"
        ring={0.2}
        ringLabel="거주 가능도 20%"
        badge="LV 3"
        badgeLabel="탐사 단계: 착륙"
        fields={[
          { label: '질량', value: '0.107 M⊕' },
          { label: '반지름', value: '3,390 km' },
        ]}
      />
    ))
    expect(screen.getByText('질량').tagName).toBe('DT')
    expect(screen.getByText('0.107 M⊕').tagName).toBe('DD')
    expect(screen.getByText('탐사 단계: 착륙')).toBeInTheDocument()
    container
      .querySelectorAll('svg')
      .forEach((svg) => expect(svg).toHaveAttribute('aria-hidden', 'true'))
  })
})
