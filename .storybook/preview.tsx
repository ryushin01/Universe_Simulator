import type { Preview } from 'storybook-solidjs-vite'
import '@fontsource-variable/jost/wght.css'
import '../src/app/styles/global.css'

const preview: Preview = {
  parameters: {
    backgrounds: { disable: true },
    layout: 'padded',
    a11y: { test: 'error' },
  },
  decorators: [
    (Story) => (
      <div lang="ko" class="sb-frame">
        <Story />
      </div>
    ),
  ],
}

export default preview
