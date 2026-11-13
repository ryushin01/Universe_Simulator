import type { StorybookConfig } from 'storybook-solidjs-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y'],
  framework: {
    name: 'storybook-solidjs-vite',
    // 사전 렌더링(ssr) 없이 Solid + Lightning CSS만 쓰는 설정
    options: { builder: { viteConfigPath: '.storybook/vite.config.ts' } },
  },
  staticDirs: ['../public'],
}

export default config
