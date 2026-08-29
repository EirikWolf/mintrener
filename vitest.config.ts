import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    // Regeltestene krever Firestore-emulator og kjøres separat via `npm run test:rules`
    exclude: [...configDefaults.exclude, 'tests/rules/**'],
  },
})
