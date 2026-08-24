import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadEnv } from 'vite';

export const PUBLIC_API_BASE_URL_ENV = 'PUBLIC_API_BASE_URL';
export const PUBLIC_API_ORIGIN_PLACEHOLDER = '__PUBLIC_API_ORIGIN__';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const missingMessage =
  'PUBLIC_API_BASE_URL is required at web build. Set it in the environment or web/.env (see web/.env.example).';
const invalidUrlMessage =
  'PUBLIC_API_BASE_URL must be an absolute http(s) URL. Set it in the environment or web/.env (see web/.env.example).';

function stripTrailingSlashes(value) {
  return value.replace(/\/+$/, '');
}

export function resolveAstroMode() {
  const args = process.argv;
  const flagIndex = args.indexOf('--mode');
  if (flagIndex >= 0 && args[flagIndex + 1] && !args[flagIndex + 1].startsWith('-')) {
    return args[flagIndex + 1];
  }
  const inline = args.find((arg) => arg.startsWith('--mode='));
  if (inline) {
    return inline.slice('--mode='.length);
  }
  if (args.includes('dev') || args.includes('preview')) {
    return 'development';
  }
  // `astro build` and postbuild default to production even if NODE_ENV is development.
  return 'production';
}

export function publicApiOriginFromBaseUrl(apiBaseUrl) {
  let url;
  try {
    url = new URL(apiBaseUrl);
  } catch {
    throw new Error(invalidUrlMessage);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(invalidUrlMessage);
  }
  return url.origin;
}

export function extractPublicApiBaseUrlFromHtml(html) {
  const matches = [
    ...html.matchAll(/\bconst\s+apiBaseUrl\s*=\s*("(?:\\.|[^"\\])*")/g),
  ];
  if (matches.length === 0) {
    throw new Error(
      'Built reset-password page is missing the PUBLIC_API_BASE_URL value.',
    );
  }

  const values = matches.map((match) => {
    try {
      return JSON.parse(match[1]).trim().replace(/\/+$/, '');
    } catch {
      throw new Error(
        'Built reset-password page contains an invalid PUBLIC_API_BASE_URL value.',
      );
    }
  });
  const uniqueValues = [...new Set(values)];
  if (uniqueValues.length !== 1) {
    throw new Error(
      'Built reset-password page contains conflicting PUBLIC_API_BASE_URL values.',
    );
  }

  publicApiOriginFromBaseUrl(uniqueValues[0]);
  return uniqueValues[0];
}

export function applyPublicApiOriginToHeaders(headersText, origin) {
  if (!headersText.includes(PUBLIC_API_ORIGIN_PLACEHOLDER)) {
    throw new Error(
      '_headers is missing the PUBLIC_API_BASE_URL connect-src placeholder.',
    );
  }
  return headersText.replaceAll(PUBLIC_API_ORIGIN_PLACEHOLDER, origin);
}

export function writePublicApiConnectSrc(headersPath, apiBaseUrl) {
  const origin = publicApiOriginFromBaseUrl(apiBaseUrl);
  const original = fs.readFileSync(headersPath, 'utf8');
  fs.writeFileSync(
    headersPath,
    applyPublicApiOriginToHeaders(original, origin),
  );
  return origin;
}

export function resolvePublicApiBaseUrl({ required = false } = {}) {
  const fromProcess = process.env[PUBLIC_API_BASE_URL_ENV];
  let raw;
  if (fromProcess !== undefined) {
    raw = fromProcess;
  } else {
    raw = loadEnv(resolveAstroMode(), webRoot, 'PUBLIC_')[PUBLIC_API_BASE_URL_ENV];
  }
  const value = stripTrailingSlashes((raw ?? '').trim());

  if (required) {
    if (!value) {
      throw new Error(missingMessage);
    }
    publicApiOriginFromBaseUrl(value);
  }

  return value;
}
