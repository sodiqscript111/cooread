import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Tests cover the framework-free modules in lib/, so they don't need WXT's
// browser polyfills — just a DOM.
export default defineConfig({
    resolve: {
        alias: {
            '@coreeder/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
        },
    },
    test: {
        environment: 'happy-dom',
    },
});
