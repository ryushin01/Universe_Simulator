import { InputProxy } from './inputProxy'

describe('InputProxy', () => {
  it('넘겨받은 입력을 같은 종류의 듣는 함수에 내보낸다', () => {
    const proxy = new InputProxy()
    const seen: Array<[string, number | undefined]> = []
    const onDown = (e: { type: string; clientX?: number }) =>
      seen.push([e.type, e.clientX])
    proxy.addEventListener('pointerdown', onDown)
    proxy.dispatch({ type: 'pointerdown', clientX: 12, pointerId: 1 })
    proxy.dispatch({ type: 'pointermove', clientX: 20, pointerId: 1 })
    proxy.removeEventListener('pointerdown', onDown)
    proxy.dispatch({ type: 'pointerdown', clientX: 30, pointerId: 1 })
    expect(seen).toEqual([['pointerdown', 12]])
  })

  it('문서(ownerDocument)도 자기 자신이라 끌기 중 움직임을 받는다', () => {
    const proxy = new InputProxy()
    const moves: number[] = []
    proxy.ownerDocument.addEventListener('pointermove', (e) =>
      moves.push(e.clientX ?? 0),
    )
    proxy.dispatch({ type: 'pointermove', clientX: 5 })
    expect(moves).toEqual([5])
  })

  it('화면 위치와 크기를 DOM 요소처럼 알려 준다', () => {
    const proxy = new InputProxy()
    proxy.setRect({ left: 10, top: 20, width: 300, height: 200 })
    expect(proxy.clientWidth).toBe(300)
    expect(proxy.getBoundingClientRect()).toMatchObject({
      left: 10,
      top: 20,
      right: 310,
      bottom: 220,
    })
  })

  it('이벤트에는 막기 함수가 있어 OrbitControls가 불러도 오류가 나지 않는다', () => {
    const proxy = new InputProxy()
    proxy.addEventListener('wheel', (e) => {
      e.preventDefault()
      e.stopPropagation()
    })
    expect(() => proxy.dispatch({ type: 'wheel', deltaY: 100 })).not.toThrow()
  })

  it('Ctrl 키 눌림을 문서(getRootNode)로 받아 휠과 핀치를 구분할 수 있다', () => {
    const proxy = new InputProxy()
    const keys: string[] = []
    proxy
      .getRootNode()
      .addEventListener('keydown', (e) => keys.push(e.key ?? ''))
    proxy.dispatch({ type: 'keydown', key: 'Control' })
    expect(keys).toEqual(['Control'])
  })
})
