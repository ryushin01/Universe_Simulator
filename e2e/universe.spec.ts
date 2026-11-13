import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// WCAG 2.2 AA와 axe 권장 규칙(랜드마크·제목 순서 등)
const RULES = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
  'best-practice',
]

async function start(page: Page, path = '/') {
  await page.goto(path)
  await page.getByRole('button', { name: '탐사 시작' }).click()
  await expect(page.getByRole('heading', { name: '우주 관리' })).toBeVisible()
}

async function axe(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(RULES).analyze()
  expect(
    results.violations.map((v) => `${label} ${v.id}: ${v.nodes.length}`),
  ).toEqual([])
}

const logText = (page: Page) => page.getByRole('region', { name: '사건 기록' })

test.describe('첫 화면', () => {
  test('소개 화면의 제목·설명·시작 버튼과 3D 장면이 나온다', async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto('/')
    await expect(page).toHaveTitle(/UNIVERSE SIMULATOR/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      /Universe Simulator/i,
    )
    await expect(page.locator('html')).toHaveAttribute('lang', 'ko')
    // 3D는 렌더링 워커가 그림. 소프트웨어 WebGL(SwiftShader)은 컨텍스트를 만드는 데만
    // 몇 초, 기계가 바쁘면 10초 넘게 걸리므로 넉넉히 기다림
    await expect(page.locator('canvas')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('3D 우주를 준비하는 중')).toBeHidden({
      timeout: 45_000,
    })
    // 소개 화면이 떠 있는 동안 main 랜드마크는 남기고 안의 영역은 inert
    const panels = page
      .locator('main > div')
      .filter({ has: page.locator('#controls') })
    await expect(page.getByRole('main')).toBeAttached()
    await expect(page.locator('#stage')).toHaveAttribute('inert', '')
    await expect(panels).toHaveAttribute('inert', '')
    await axe(page, 'intro')
    await page.getByRole('button', { name: '탐사 시작' }).click()
    await expect(page.locator('#stage')).not.toHaveAttribute('inert', '')
    await expect(panels).not.toHaveAttribute('inert', '')
    await expect(page.locator('#controls')).toBeFocused()
    expect(errors).toEqual([])
  })

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    test(`${viewport.width}px에서 가로로 넘치지 않는다`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await start(page)
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      )
      expect(overflow).toBeLessThanOrEqual(0)
    })
  }

  test('모든 탭과 규모에서 axe 접근성 검사를 통과한다', async ({ page }) => {
    test.setTimeout(180_000)
    await start(page)
    for (const name of [
      '충돌',
      '태양 폭풍',
      '별 폭발',
      '블랙홀',
      '유성우',
      '태양의 미래',
      '건설',
    ]) {
      await page.getByRole('tab', { name, exact: true }).click()
      await axe(page, name)
    }
    for (const name of [
      '이웃 별',
      '우리 은하',
      '국부 은하군',
      '우주 거대 구조',
    ]) {
      await page
        .getByRole('radio', { name: new RegExp(name) })
        .check({ force: true })
      await expect(page.getByRole('group', { name, exact: true })).toBeVisible()
      await axe(page, name)
    }
  })

  test('웹 앱 매니페스트와 아이콘이 있다', async ({ page, request }) => {
    await page.goto('/')
    const href = await page.locator('link[rel="manifest"]').getAttribute('href')
    const manifest = await (await request.get(href!)).json()
    expect(manifest.short_name).toBe('UNIVERSE')
    for (const icon of manifest.icons)
      expect((await request.get(icon.src)).ok()).toBe(true)
  })
})

test.describe('키보드', () => {
  test('본문 바로가기, 탭 화살표 이동, 3D 장면 키 조작', async ({ page }) => {
    await start(page)
    await page.keyboard.press('Tab')
    await expect(
      page.getByRole('tab', { name: '충돌', exact: true }),
    ).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('tab', { name: '태양 폭풍' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await page.getByRole('group', { name: '우주 장면 조작 영역' }).focus()
    await page.keyboard.press('ArrowLeft')
    // 보기 설정은 펼침 버튼 안에 있음
    const view = page.getByRole('button', { name: '보기', exact: true })
    await view.click()
    await expect(view).toHaveAttribute('aria-expanded', 'true')
    await expect(
      page.getByRole('button', { name: '자동 회전' }),
    ).toHaveAttribute('aria-pressed', 'false')
  })

  test('본문 바로가기 링크가 우주 관리로 옮겨 준다', async ({ page }) => {
    await start(page)
    // 문서 처음에서 Tab을 누른 것처럼 (크롬은 흐린 요소 자리를 시작점으로 기억함)
    await page.evaluate(() => {
      document.body.tabIndex = -1
      document.body.focus()
      document.body.removeAttribute('tabindex')
    })
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: '우주 관리로 건너뛰기' })
    await expect(skip).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#controls')).toBeFocused()
  })
})

test.describe('시뮬레이션 흐름', () => {
  test('칙술루브급 소행성이 지구에 떨어지면 대멸종을 기록한다', async ({
    page,
  }) => {
    await start(page)
    await page.getByRole('button', { name: '칙술루브급' }).click()
    await page.getByRole('radio', { name: '하루' }).check({ force: true })
    await page.getByRole('button', { name: '충돌 궤도에 올리기' }).click()
    await page.getByRole('button', { name: '시간 흐름 재생' }).click()
    await expect(logText(page)).toContainText('대멸종', { timeout: 15_000 })
  })

  test('행성 방위 요격망이 다가오는 소행성을 비껴 가게 한다', async ({
    page,
  }) => {
    await start(page)
    await page.getByRole('tab', { name: '건설' }).click()
    await page.getByRole('checkbox', { name: /바로 완공/ }).check()
    await page.getByRole('button', { name: '행성 방위 요격망 짓기' }).click()
    await page.getByRole('tab', { name: '충돌', exact: true }).click()
    await page.getByRole('button', { name: '아포피스 크기' }).click()
    await page.getByRole('button', { name: '충돌 궤도에 올리기' }).click()
    await expect(logText(page)).toContainText('운동 충돌체 10기')
    await page
      .getByRole('slider', { name: '시간 속도 (화면 1초마다)' })
      .fill('5')
    await page.getByRole('button', { name: '시간 흐름 재생' }).click()
    await expect(logText(page)).toContainText('비껴 갔습니다', {
      timeout: 20_000,
    })
  })

  test('캐링턴급 태양 폭풍이 지구에 닿아 피해를 남긴다', async ({ page }) => {
    await start(page)
    await page.getByRole('tab', { name: '태양 폭풍' }).click()
    await page
      .getByRole('button', { name: '코로나 질량 방출 일으키기' })
      .click()
    await page.getByRole('button', { name: '시간 흐름 재생' }).click()
    await expect(logText(page)).toContainText('지구에 닿았습니다', {
      timeout: 15_000,
    })
    await expect(page.getByText('누적 피해')).toBeVisible()
  })

  test('태양의 미래로 건너뛰면 적색 거성이 지구를 삼킨다', async ({ page }) => {
    await start(page)
    await page.getByRole('tab', { name: '태양의 미래' }).click()
    await page
      .getByRole('button', { name: '적색 거성 가지 끝 (가장 큼)(으)로 이동' })
      .click()
    await expect(logText(page)).toContainText('지구를 삼켰습니다')
    await expect(page.getByRole('radio', { name: /지구.*없음/ })).toBeAttached()
  })

  test('별 폭발과 블랙홀 사고 실험을 기록한다', async ({ page }) => {
    await start(page)
    await page.getByRole('tab', { name: '별 폭발' }).click()
    await page.getByRole('button', { name: '폭발시키기' }).click()
    await expect(logText(page)).toContainText('베텔게우스 초신성')
    await page.getByRole('tab', { name: '블랙홀' }).click()
    await page.getByRole('button', { name: '태양을 블랙홀로 바꾸기' }).click()
    await expect(logText(page)).toContainText('사고 실험')
    await expect(
      page
        .getByRole('region', { name: '현황' })
        .getByText('블랙홀 (사고 실험)'),
    ).toBeVisible()
  })

  test('유성우 극대 전날로 이동한다', async ({ page }) => {
    await start(page)
    await page.getByRole('tab', { name: '유성우' }).click()
    await page
      .getByRole('button', { name: '쌍둥이자리 유성우 극대 전날로 이동' })
      .click()
    await expect(
      page.getByRole('tabpanel', { name: '유성우' }).getByRole('status'),
    ).toContainText('극대 하루 전으로 이동했습니다')
  })

  test('미션을 시작하면 2026 PDC가 다가온다', async ({ page }) => {
    await start(page)
    await page
      .getByRole('region', { name: '미션' })
      .getByRole('button', { name: '시작' })
      .first()
      .click()
    await expect(
      page.getByRole('region', { name: '미션' }).getByText('남은 시간'),
    ).toBeVisible()
    await expect(
      page.getByRole('tabpanel', { name: '충돌' }).getByText('2026 PDC'),
    ).toBeVisible()
  })

  test('공유 링크로 열면 소개 없이 같은 장면이 나온다', async ({ page }) => {
    await start(page)
    await page.getByRole('tab', { name: '건설' }).click()
    await page.getByRole('checkbox', { name: /바로 완공/ }).check()
    await page.getByRole('button', { name: '우주 기상 경보 위성 짓기' }).click()
    await page.getByText('공유·저장').click()
    await page.getByRole('button', { name: '공유 링크 복사' }).click()
    const status = page
      .getByRole('region', { name: '현황' })
      .getByRole('status')
      .last()
    await expect(status).toContainText(/공유 링크/)
    const url = await page.evaluate(async () => {
      try {
        return await navigator.clipboard.readText()
      } catch {
        return window.location.href
      }
    })
    const shared = url.includes('?s=') ? url : page.url()
    await page.goto(shared)
    await expect(page.getByRole('button', { name: '탐사 시작' })).toHaveCount(0)
    await page.getByRole('tab', { name: '건설' }).click()
    // '바로 완공' 체크박스 글자와 헷갈리지 않게 경보 위성 카드 안에서 확인
    const satellite = page
      .getByRole('tabpanel', { name: '건설' })
      .getByRole('listitem')
      .filter({ hasText: '우주 기상 경보 위성' })
    await expect(satellite.getByText('완공', { exact: true })).toBeVisible()
  })

  test('영어로 바꾸면 문서 언어와 문구가 바뀐다', async ({ page }) => {
    await start(page)
    await page.getByRole('button', { name: 'English' }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(
      page.getByRole('heading', { name: 'Space control' }),
    ).toBeVisible()
    await page.reload()
    await expect(
      page.getByRole('button', { name: 'Start exploring' }),
    ).toBeVisible()
  })
})
