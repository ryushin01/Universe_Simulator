import { galacticLonLat } from './math'

describe('좌표 변환', () => {
  it('궁수자리 A*는 은하 중심(l≈0°, b≈0°) 방향이다', () => {
    const { l, b } = galacticLonLat(266.41683, -29.00781)
    expect(Math.min(l, 360 - l)).toBeLessThan(0.2)
    expect(Math.abs(b)).toBeLessThan(0.2)
  })

  it('은하 북극은 머리털자리 근처(적경 192.86°, 적위 27.13°)', () => {
    expect(galacticLonLat(192.85948, 27.12825).b).toBeCloseTo(90, 3)
  })
})
