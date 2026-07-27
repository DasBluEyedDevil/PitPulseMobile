import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import {
  readJson,
  validateAasa,
  validateAssetlinks,
} from './association-contracts.mjs';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(currentDir, '..');
const distDir = path.join(webRoot, 'dist');
const failures = [];
const requiredPages = new Map([
  ['reset-password', ['Reset password', '/auth/reset-password', 'URLSearchParams']],
  ['delete-account', ['Delete your account', 'support@soundcheck.app']],
  ['support', ['Support', 'support@soundcheck.app']],
  ['privacy', ['Privacy Policy']],
  ['terms', ['Terms of Service']],
  ['child-safety', ['Child Safety']],
  ['download', ['Download SoundCheck']],
]);

function requireFile(relativePath) {
  const filePath = path.join(distDir, relativePath);
  if (!fs.existsSync(filePath)) {
    failures.push(`Missing built file ${relativePath}`);
    return null;
  }
  return filePath;
}

function checkPage(route, markers) {
  const filePath = requireFile(path.join(route, 'index.html'));
  if (!filePath) {
    return;
  }
  const html = fs.readFileSync(filePath, 'utf8');
  markers.forEach((marker) => {
    if (!html.includes(marker)) {
      failures.push(`/${route} is missing ${JSON.stringify(marker)}.`);
    }
  });
  for (const asset of ['/favicon.png', '/og-image.png', '/soundcheck-header-logo.png']) {
    if (!html.includes(asset)) {
      failures.push(`/${route} is missing the public asset reference ${asset}.`);
    }
  }
}

async function checkImage(relativePath, options = {}) {
  const filePath = requireFile(relativePath);
  if (!filePath) {
    return;
  }
  const metadata = await sharp(filePath).metadata();
  if (metadata.format !== 'png') {
    failures.push(`${relativePath} must contain PNG data; found ${metadata.format}.`);
  }
  if (options.square && metadata.width !== metadata.height) {
    failures.push(`${relativePath} must be square.`);
  }
  if (!metadata.width || !metadata.height) {
    failures.push(`${relativePath} has invalid dimensions.`);
  }
}

async function main() {
  if (!fs.existsSync(distDir)) {
    throw new Error('web/dist is absent; run astro build before validating the public surface.');
  }

  requiredPages.forEach((markers, route) => checkPage(route, markers));
  await checkImage('favicon.png');
  await checkImage('og-image.png');
  await checkImage('soundcheck-header-logo.png');

  const aasaPath = requireFile('.well-known/apple-app-site-association');
  if (aasaPath) {
    try {
      validateAasa(readJson(aasaPath, 'built apple-app-site-association'));
    } catch (error) {
      failures.push(error.message);
    }
  }

  const assetlinksPath = path.join(distDir, '.well-known/assetlinks.json');
  if (fs.existsSync(assetlinksPath)) {
    try {
      validateAssetlinks(readJson(assetlinksPath, 'built assetlinks.json'));
    } catch (error) {
      failures.push(error.message);
    }
  } else {
    console.warn(
      'Android association pending: no assetlinks.json is published until the app-signing fingerprint is verified.',
    );
  }

  const headersPath = requireFile('_headers');
  if (headersPath) {
    const headers = fs.readFileSync(headersPath, 'utf8');
    for (const associationPath of [
      '/.well-known/apple-app-site-association',
      '/.well-known/assetlinks.json',
    ]) {
      const escapedPath = associationPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const associationBlock = headers.match(
        new RegExp(`^${escapedPath}\\r?\\n((?:[ \\t]+[^\\r\\n]+\\r?\\n?)*)`, 'm'),
      );
      if (
        !associationBlock ||
        !/^[ \t]+Content-Type:\s*application\/json(?:;\s*charset=utf-8)?\s*$/m.test(
          associationBlock[1],
        )
      ) {
        failures.push(`_headers does not declare JSON for ${associationPath}.`);
      }
    }
  }

  const redirectsPath = requireFile('_redirects');
  if (redirectsPath) {
    const redirects = fs.readFileSync(redirectsPath, 'utf8');
    for (const redirect of [
      '/privacy.html /privacy 301',
      '/terms.html /terms 301',
      '/support.html /support 301',
      '/delete-account.html /delete-account 301',
    ]) {
      if (!redirects.includes(redirect)) {
        failures.push(`Missing redirect contract: ${redirect}`);
      }
    }
  }

  if (failures.length > 0) {
    console.error('Public web build validation failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log(
    'Public web build validation passed: lifecycle/legal pages, AASA, redirects, and PNG content signatures.',
  );
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
