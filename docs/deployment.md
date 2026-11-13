# 배포

`main`에 올라가면 `.github/workflows/pages.yml`이 GitHub Pages에 배포합니다.

| 주소                                                      | 내용       |
| --------------------------------------------------------- | ---------- |
| https://ryushin01.github.io/Universe_Simulator/           | 시뮬레이터 |
| https://ryushin01.github.io/Universe_Simulator/storybook/ | Storybook  |

## 빌드 과정

`pnpm build`는 세 단계입니다.

1. `vite build`: 브라우저용 묶음 (`dist/client`)
2. `vite build --ssr src/app/entry-server.tsx --outDir dist/server`: 첫 화면을 그릴 서버 묶음
3. `node scripts/prerender.mjs`: 서버 묶음으로 그린 HTML과 hydration 스크립트를 `dist/client/index.html`에 넣고 `dist/server`를 지움

## 하위 경로

Pages 주소는 저장소 이름 아래(`/Universe_Simulator/`)라서, 빌드할 때 `BASE_PATH`로 경로 접두사를 넘깁니다.

```bash
BASE_PATH=/Universe_Simulator/ pnpm build:all
```

- `vite.config.ts`의 `base`가 이 값을 씁니다. 기본값은 `/`입니다.
- `index.html`의 아이콘·매니페스트는 `%BASE_URL%`, 텍스처처럼 `public`에 있는 파일은 `import.meta.env.BASE_URL`을 앞에 붙여 부릅니다(`src/shared/config`).
- 사전 렌더링한 `index.html`을 `404.html`로도 복사해, 없는 주소로 들어와도 앱이 열립니다.
- 공유 링크(`?s=`)는 현재 주소를 바탕으로 만들므로 하위 경로에서도 그대로 동작합니다.
- 서비스 워커(`public/sw.js`)는 등록 범위를 기준으로 경로를 계산하므로 하위 경로에서도 같은 파일을 씁니다.

## 서비스 워커 캐시

- 페이지는 네트워크 먼저(성공한 응답만 저장), 끊기면 저장해 둔 페이지를 씁니다.
- `assets/`(파일 이름에 해시가 붙은 코드)와 `textures/`는 캐시 먼저입니다.
- 텍스처는 파일 이름에 해시가 없으므로, 같은 이름으로 바꿔 올릴 때는 `sw.js`의 `VERSION`을 올려 옛 캐시를 지웁니다.

## 직접 실행

Actions 탭에서 **Pages** 워크플로를 고르고 **Run workflow**를 누르면 `main`을 다시 배포합니다.
