import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  IOS_APP_ID,
  readJson,
  validateAasa,
  validateAssetlinks,
} from './association-contracts.mjs';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const wellKnownDir = path.resolve(currentDir, '../public/.well-known');
const aasaPath = path.join(wellKnownDir, 'apple-app-site-association');
const assetlinksPath = path.join(wellKnownDir, 'assetlinks.json');
const aasaOnly = process.argv.includes('--aasa-only');

try {
  validateAasa(readJson(aasaPath, 'apple-app-site-association'));
  console.log(`AASA passed for ${IOS_APP_ID}.`);

  if (!aasaOnly) {
    const expectedFingerprint =
      process.env.SOUNDCHECK_ANDROID_VERIFIED_APP_SIGNING_SHA256;
    if (!expectedFingerprint) {
      throw new Error(
        'SOUNDCHECK_ANDROID_VERIFIED_APP_SIGNING_SHA256 is required to validate Android association provenance.',
      );
    }
    if (!fs.existsSync(assetlinksPath)) {
      throw new Error(
        'assetlinks.json is absent. Generate it only after the Android app-signing fingerprint is independently verified.',
      );
    }
    const fingerprint = validateAssetlinks(
      readJson(assetlinksPath, 'assetlinks.json'),
      expectedFingerprint,
    );
    console.log(`Android association passed for com.soundcheck.app (${fingerprint}).`);
  }
} catch (error) {
  console.error(`Association validation failed: ${error.message}`);
  process.exit(1);
}
