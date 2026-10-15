import { defineConfig } from 'tsup';

// Bundles the API (and the @coreeder/shared source it imports) into a single
// ESM file. npm dependencies stay external and are installed normally.
export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm'],
    platform: 'node',
    target: 'node22',
    outDir: 'dist',
    clean: true,
    sourcemap: true,
    noExternal: ['@coreeder/shared'],
});
