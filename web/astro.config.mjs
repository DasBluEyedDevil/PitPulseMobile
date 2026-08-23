import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import { resolvePublicApiBaseUrl } from './scripts/public-api-base-url.mjs';

// Fail closed for `astro build` so production cannot silently target a hardcoded API host.
if (process.argv.includes('build')) {
  resolvePublicApiBaseUrl({ required: true });
}

export default defineConfig({
  site: 'https://soundcheck.app',
  output: 'static',
  vite: {
    plugins: [tailwindcss()],
  },
});
