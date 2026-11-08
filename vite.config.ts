import { defineConfig } from 'vitest/config'

// GitHub Pages serves this repo under /sundai-hack-148/.
export default defineConfig({
  base: '/sundai-hack-148/',
  test: {
    include: ['tests/unit/**/*.test.ts', 'worker/test/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30000,
  },
})
