// vitest.config.ts
// Vitest config — uses jsdom for component tests later if needed,
// but the current test suite is pure utility functions (no DOM).

import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
