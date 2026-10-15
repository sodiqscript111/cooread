import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@coreeder/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
        },
    },
    test: {
        // PGlite boots a WASM Postgres per test file; give it room on slow machines.
        testTimeout: 60_000,
        hookTimeout: 60_000,
    },
});
