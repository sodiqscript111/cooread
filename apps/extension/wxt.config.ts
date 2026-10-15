import { fileURLToPath } from 'node:url';
import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
    alias: {
        '@coreeder/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
    },
    manifest: {
        name: 'CoReeder',
        description: "Context-aware reading assistant — explains highlighted text based on what you've already read.",
        // contextMenus: "Explain with CoReeder"; identity: Google sign-in via Supabase;
        // scripting: inject into tabs that were open before install; storage: session + saved URLs.
        permissions: ['contextMenus', 'identity', 'scripting', 'storage'],
        // The launcher and selection button appear on every page, so the content script runs everywhere.
        host_permissions: ['<all_urls>'],
        icons: {
            16: 'icons/icon16.png',
            48: 'icons/icon48.png',
            128: 'icons/icon128.png',
        },
        action: {
            default_title: 'CoReeder',
            default_icon: {
                16: 'icons/icon16.png',
                48: 'icons/icon48.png',
            },
        },
        web_accessible_resources: [
            {
                resources: ['icons/riftlogo.png', 'icons/loading.gif'],
                matches: ['<all_urls>'],
            },
        ],
    },
});
