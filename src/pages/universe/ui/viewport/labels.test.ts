import { placeLabels } from './labels'

describe('placeLabels', () => {
  it('받은 위치로 이름표를 옮기고 나머지는 감춘다', () => {
    const earth = document.createElement('span')
    const mars = document.createElement('span')
    const elements = new Map([
      ['earth', earth],
      ['mars', mars],
    ])
    placeLabels(elements, [{ id: 'earth', x: 120.04, y: 80, centered: true }])
    expect(earth.style.visibility).toBe('visible')
    // 소수 첫째 자리까지 (브라우저가 120.0px을 120px로 정규화)
    expect(earth.style.transform).toBe(
      'translate(120px, 80px) translate(-50%, -50%)',
    )
    expect(earth.dataset.mode).toBe('center')
    expect(mars.style.visibility).toBe('hidden')
  })

  it('없는 이름표의 위치는 건너뛰고, 빈 목록이면 모두 감춘다', () => {
    const earth = document.createElement('span')
    const elements = new Map([['earth', earth]])
    placeLabels(elements, [{ id: 'pluto', x: 1, y: 1, centered: false }])
    expect(earth.style.visibility).toBe('hidden')
    placeLabels(elements, [{ id: 'earth', x: 1, y: 1, centered: false }])
    expect(earth.dataset.mode).toBe('below')
    placeLabels(elements, [])
    expect(earth.style.visibility).toBe('hidden')
  })
})
