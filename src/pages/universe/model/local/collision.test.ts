import { advanceCollision, createCollision, separation } from './collision'

describe('우리 은하-안드로메다 충돌', () => {
  it('수십억 년 뒤 가까이 지나간 다음 합쳐진다', () => {
    const c = createCollision({
      year: 2026,
      andromeda: [1200, -800, 2000],
      perGalaxy: 20,
      seed: 1,
    })
    const start = separation(c)
    expect(start).toBeGreaterThan(2400)
    let closestYear = 0
    let closest = Infinity
    for (let gyr = 0.5; gyr <= 10; gyr += 0.25) {
      while (!advanceCollision(c, 2026 + gyr * 1e9, 1000)) {
        /* 따라잡기 */
      }
      const d = separation(c)
      if (d < closest && !c.merged) {
        closest = d
        closestYear = gyr
      }
    }
    expect(closestYear).toBeGreaterThan(3)
    expect(closestYear).toBeLessThan(6.5)
    expect(c.merged).toBe(true)
  })
})
