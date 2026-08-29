import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    // Regeltestene krever Firestore-emulator og kjøres separat via `npm run test:rules`.
    // .claude/ ekskluderes fordi agent-worktrees (.claude/worktrees/<navn>/) er hele
    // repo-kopier — uten filteret sveiper vitest opp ANDRE økters testfiler og
    // dobbelt-/feilkjører dem mot deres halvferdige tilstand.
    exclude: [...configDefaults.exclude, 'tests/rules/**', '**/.claude/**'],
  },
})
