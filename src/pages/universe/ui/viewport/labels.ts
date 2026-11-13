import type { LabelPosition } from '../scene/types'

/**
 * 엔진이 계산한 위치로 이름표를 옮기고, 목록에 없는(화면 밖·숨김) 이름표는 감춤.
 * (워커는 DOM을 만질 수 없으므로 위치만 계산하고 여기서 그림)
 */
export function placeLabels(
  elements: Map<string, HTMLElement>,
  positions: LabelPosition[],
) {
  const shown = new Set<string>()
  for (const p of positions) {
    const el = elements.get(p.id)
    if (!el) continue
    shown.add(p.id)
    el.style.visibility = 'visible'
    el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -50%)`
    el.dataset.mode = p.centered ? 'center' : 'below'
  }
  for (const [id, el] of elements)
    if (!shown.has(id)) el.style.visibility = 'hidden'
}
