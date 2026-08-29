import { defineConfig } from 'vitest/config';

// Egen Vitest-konfig for Firestore-regeltestene. Disse krever en kjørende
// Firestore-emulator (Java) og holdes derfor utenfor standard `npm test`,
// slik at vanlige enhetstester ikke feiler på maskiner uten emulator.
// Kjøres via `npm run test:rules` (firebase emulators:exec).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    // Emulatoroperasjoner kan være trege ved kaldstart i CI
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
