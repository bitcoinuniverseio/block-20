import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: '../test-results/launchpad',
  workers: 1,
  use: { browserName: 'chromium', viewport: { width: 390, height: 844 } },
})
