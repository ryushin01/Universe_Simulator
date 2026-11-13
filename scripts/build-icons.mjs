// public/favicon.svg로 PWA 아이콘 PNG를 만듭니다 (Chromium으로 렌더링).
// 사용: pnpm icons
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const root = fileURLToPath(new URL('..', import.meta.url))
const svg = await readFile(`${root}public/favicon.svg`, 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage({ deviceScaleFactor: 1 })

/** padding: 가장자리 여백 비율 (maskable은 안전 영역 80% 안에 들도록) */
async function render(file, size, padding, rounded) {
  await page.setViewportSize({ width: size, height: size })
  const inner = Math.round(size * (1 - padding * 2))
  const art = rounded ? svg : svg.replace('rx="12"', 'rx="0"')
  await page.setContent(
    `<html><body style="margin:0;background:#04060d;display:grid;place-items:center;width:${size}px;height:${size}px">` +
      `<div style="width:${inner}px;height:${inner}px">${art.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div></body></html>`,
  )
  await page.screenshot({
    path: `${root}public/${file}`,
    omitBackground: false,
  })
  console.log('wrote', file)
}

await render('icon-192.png', 192, 0, false)
await render('icon-512.png', 512, 0, false)
await render('icon-maskable-512.png', 512, 0.12, false)
await render('apple-touch-icon.png', 180, 0, false)
await browser.close()
