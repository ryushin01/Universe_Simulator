import { hydrate, render } from 'solid-js/web'
import '@fontsource-variable/jost/wght.css'
import './styles/global.css'
import { App } from './App'

const root = document.getElementById('app')!
// 빌드 때 사전 렌더링한 HTML이 있으면 이어받고, 개발 서버에서는 새로 그림
if (root.firstElementChild) hydrate(() => <App />, root)
else render(() => <App />, root)
