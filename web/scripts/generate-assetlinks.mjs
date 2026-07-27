import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createAssetlinksDocument } from './association-contracts.mjs';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.resolve(currentDir, '../public/.well-known/assetlinks.json');
const argumentIndex = process.argv.indexOf('--fingerprint');
const argumentFingerprint =
  argumentIndex >= 0 && argumentIndex + 1 < process.argv.length
    ? process.argv[argumentIndex + 1]
    : '';
const fingerprint =
  argumentFingerprint || process.env.SOUNDCHECK_ANDROID_VERIFIED_APP_SIGNING_SHA256;

if (!fingerprint) {
  console.error(
    [
      'Refusing to generate assetlinks.json without a verified Android app-signing SHA-256 fingerprint.',
      'Set SOUNDCHECK_ANDROID_VERIFIED_APP_SIGNING_SHA256 or pass --fingerprint.',
      'Use the Play App Signing certificate when Play App Signing is enabled; do not use an upload-key fingerprint.',
      'No file was changed.',
    ].join('\n'),
  );
  process.exit(1);
}

try {
  const document = createAssetlinksDocument(fingerprint);
  const temporaryPath = `${outputPath}.tmp`;
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(temporaryPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
  fs.renameSync(temporaryPath, outputPath);
  console.log(`Generated ${path.relative(path.resolve(currentDir, '../..'), outputPath)}.`);
} catch (error) {
  console.error(`Refusing to generate assetlinks.json: ${error.message}`);
  process.exit(1);
}
