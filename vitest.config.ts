import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    // Regeltestene krever Firestore-emulator og kjøres separat via `npm run test:rules`;
    // Playwright-røyken (e2e/) kjøres av Playwright via `npm run test:e2e`, ikke Vitest.
    exclude: [...configDefaults.exclude, 'tests/rules/**', 'e2e/**'],
  },
})
