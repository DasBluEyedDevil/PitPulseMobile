import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import {
  PUBLIC_API_BASE_URL_ENV,
  resolvePublicApiBaseUrl,
  writePublicApiConnectSrc,
} from './scripts/public-api-base-url.mjs';

function publicApiCspIntegration() {
  return {
    name: 'public-api-csp',
    hooks: {
      'astro:build:done': ({ dir }) => {
        const apiBaseUrl = resolvePublicApiBaseUrl({ required: true });
        const headersPath = path.join(fileURLToPath(dir), '_headers');
        if (!fs.existsSync(headersPath)) {
          throw new Error('Built _headers is missing.');
        }
        writePublicApiConnectSrc(headersPath, apiBaseUrl);
      },
    },
  };
}

// Fail closed for `astro build` so production cannot silently target a hardcoded API host.
if (process.argv.includes('build')) {
  const apiBaseUrl = resolvePublicApiBaseUrl({ required: true });
  process.env[PUBLIC_API_BASE_URL_ENV] = apiBaseUrl;
}

export default defineConfig({
  site: 'https://soundcheck.app',
  output: 'static',
  integrations: [publicApiCspIntegration()],
  vite: {
    plugins: [tailwindcss()],
  },
});
