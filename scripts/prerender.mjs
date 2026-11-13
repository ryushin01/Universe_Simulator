// 빌드한 서버 묶음으로 첫 화면을 HTML로 그려 dist/client/index.html에 넣습니다.
// (Solid가 브라우저에서 이 HTML을 이어받아 hydrate)
import { readFile, rm, writeFile } from 'node:fs/promises'

const distUrl = new URL('../dist/', import.meta.url)
const htmlPath = new URL('client/index.html', distUrl)
const serverDir = new URL('server/', distUrl)

// Windows의 C:\ 같은 경로는 import()가 URL로 읽지 못하므로 file:// 주소로 불러옴
const { render } = await import(new URL('entry-server.js', serverDir).href)
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
await rm(serverDir, { recursive: true, force: true })
console.log('prerendered dist/client/index.html')
