import { generateHydrationScript, renderToString } from 'solid-js/web'
import { App } from './App'

/** 첫 화면 HTML (scripts/prerender.mjs가 dist/client/index.html에 넣음) */
export function render() {
  return {
    html: renderToString(() => <App />),
    head: generateHydrationScript(),
  }
}
