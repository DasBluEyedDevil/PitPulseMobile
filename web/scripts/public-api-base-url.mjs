import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PUBLIC_API_BASE_URL_ENV = 'PUBLIC_API_BASE_URL';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const missingMessage =
  'PUBLIC_API_BASE_URL is required at web build. Set it in the environment or web/.env (see web/.env.example).';

function stripTrailingSlashes(value) {
  return value.replace(/\/+$/, '');
}

function unquote(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function readEnvFileValue(filePath, name) {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }

  const text = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const assignment = line.startsWith('export ')
      ? line.slice('export '.length).trim()
      : line;
    const separator = assignment.indexOf('=');
    if (separator <= 0) {
      continue;
    }
    const key = assignment.slice(0, separator).trim();
    if (key !== name) {
      continue;
    }
    return unquote(assignment.slice(separator + 1).trim());
  }

  return undefined;
}

function readFromDotEnvFiles() {
  // Vite precedence: later files override, process.env wins (checked by caller).
  const mode = process.env.NODE_ENV === 'development' ? 'development' : 'production';
  const files = [
    `.env.${mode}.local`,
    '.env.local',
    `.env.${mode}`,
    '.env',
  ];

  for (const file of files) {
    const value = readEnvFileValue(path.join(webRoot, file), PUBLIC_API_BASE_URL_ENV);
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

export function resolvePublicApiBaseUrl({ required = false } = {}) {
  const fromProcess = process.env[PUBLIC_API_BASE_URL_ENV];
  const raw = fromProcess !== undefined ? fromProcess : readFromDotEnvFiles();
  const value = stripTrailingSlashes((raw ?? '').trim());

  if (required && !value) {
    throw new Error(missingMessage);
  }

  return value;
}
