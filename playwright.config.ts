import { defineConfig, devices } from '@playwright/test'

const PORT = 4184

export default defineConfig({
  testDir: './e2e',
  // 소프트웨어 WebGL로 3D를 그리므로 한 테스트에 넉넉한 시간
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    launchOptions: {
      // CI에는 GPU가 없으므로 소프트웨어 WebGL을 씀
      // (--ignore-gpu-blocklist를 더하면 워커의 OffscreenCanvas WebGL이 크게 느려짐)
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // 프로덕션 빌드 결과를 띄워 검사 (먼저 pnpm build 필요)
  webServer: {
    // preview 스크립트의 --port 4183과 겹치지 않게 Vite를 바로 부름
    command: `pnpm exec vite preview --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
  },
})
