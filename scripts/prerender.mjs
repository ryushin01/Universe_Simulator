// 빌드한 서버 묶음으로 첫 화면을 HTML로 그려 dist/client/index.html에 넣습니다.
// (Solid가 브라우저에서 이 HTML을 이어받아 hydrate)
import { readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const htmlPath = `${root}dist/client/index.html`
const serverEntry = `${root}dist/server/entry-server.js`

const { render } = await import(serverEntry)
const { html, head } = render()
const template = await readFile(htmlPath, 'utf8')
if (
  !template.includes('<!--app-html-->') ||
  !template.includes('<!--app-head-->')
)
  throw new Error('index.html에 사전 렌더링 자리 표시가 없습니다')

await writeFile(
  htmlPath,
  template.replace('<!--app-head-->', head).replace('<!--app-html-->', html),
)
await rm(`${root}dist/server`, { recursive: true, force: true })
console.log('prerendered dist/client/index.html')
