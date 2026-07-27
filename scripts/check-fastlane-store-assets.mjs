import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const warnings = [];

function abs(relPath) {
  return path.join(repoRoot, relPath);
}

function readRequired(relPath) {
  const filePath = abs(relPath);
  if (!fs.existsSync(filePath)) {
    failures.push(`Missing ${relPath}`);
    return '';
  }

  const value = fs.readFileSync(filePath, 'utf8').trim();
  if (!value) {
    failures.push(`Empty ${relPath}`);
  }
  return value;
}

function checkMaxLength(relPath, maxLength) {
  const value = readRequired(relPath);
  if (value.length > maxLength) {
    failures.push(`${relPath} is ${value.length} characters; max is ${maxLength}`);
  }
}

function pngFiles(relDir) {
  const dirPath = abs(relDir);
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs
    .readdirSync(dirPath)
    .filter((name) => name.toLowerCase().endsWith('.png'))
    .sort();
}

function readPngDimensions(relPath) {
  const filePath = abs(relPath);
  if (!fs.existsSync(filePath)) {
    failures.push(`Missing ${relPath}`);
    return null;
  }

  const buffer = fs.readFileSync(filePath);
  if (
    buffer.length < 24 ||
    buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' ||
    buffer.subarray(12, 16).toString('ascii') !== 'IHDR'
  ) {
    failures.push(`${relPath} is not a valid PNG.`);
    return null;
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
  };
}

[
  'mobile/android/Gemfile',
  'mobile/android/fastlane/Appfile',
  'mobile/android/fastlane/Fastfile',
  'mobile/android/fastlane/Screengrabfile',
  'mobile/android/fastlane/Supplyfile',
  'mobile/android/fastlane/.env.example',
  'mobile/ios/Gemfile',
  'mobile/ios/fastlane/Appfile',
  'mobile/ios/fastlane/Fastfile',
  'mobile/ios/fastlane/Snapfile',
  'mobile/ios/fastlane/Deliverfile',
  'mobile/ios/fastlane/.env.example',
].forEach(readRequired);

checkMaxLength('mobile/android/fastlane/metadata/android/en-US/title.txt', 30);
checkMaxLength('mobile/android/fastlane/metadata/android/en-US/short_description.txt', 80);
checkMaxLength('mobile/android/fastlane/metadata/android/en-US/full_description.txt', 4000);
readRequired('mobile/android/fastlane/metadata/android/en-US/changelogs/default.txt');

checkMaxLength('mobile/ios/fastlane/metadata/default/name.txt', 30);
checkMaxLength('mobile/ios/fastlane/metadata/default/subtitle.txt', 30);
checkMaxLength('mobile/ios/fastlane/metadata/default/keywords.txt', 100);
checkMaxLength('mobile/ios/fastlane/metadata/default/promotional_text.txt', 170);
checkMaxLength('mobile/ios/fastlane/metadata/default/description.txt', 4000);
readRequired('mobile/ios/fastlane/metadata/default/release_notes.txt');
readRequired('mobile/ios/fastlane/metadata/default/support_url.txt');
readRequired('mobile/ios/fastlane/metadata/default/marketing_url.txt');
readRequired('mobile/ios/fastlane/metadata/default/privacy_url.txt');

const inventory = JSON.parse(
  readRequired('mobile/store-assets/screenshots/inventory.json') || '{}',
);
if (inventory.schemaVersion !== 1) {
  failures.push('Screenshot inventory schemaVersion must be 1.');
}
if (inventory.status !== 'ready-for-store-review') {
  failures.push(
    `Screenshot inventory status is ${String(inventory.status)}; expected ready-for-store-review after signed release capture and content review.`,
  );
}
if (!/^[0-9a-f]{40}$/.test(inventory.releaseCandidateSha || '')) {
  failures.push('Screenshot inventory must record the exact 40-character releaseCandidateSha.');
}
if (
  inventory.capturePolicy?.signedReleaseBuildRequired !== true ||
  inventory.capturePolicy?.minimumOsAndCurrentOsRequired !== true ||
  inventory.capturePolicy?.phoneAndTabletReviewRequired !== true
) {
  failures.push('Screenshot inventory capture policy must retain every signed-device review gate.');
}

const journeys = Array.isArray(inventory.journeys) ? inventory.journeys : [];
if (journeys.length !== 5 || new Set(journeys.map(({ id }) => id)).size !== 5) {
  failures.push('Screenshot inventory must define exactly five unique journeys.');
}

const androidScreenshots = pngFiles('mobile/store-assets/screenshots/android/curated');
const iosScreenshots = pngFiles('mobile/store-assets/screenshots/ios/curated');
const expectedAndroid = journeys.map(({ android }) => android).sort();
const expectedIos = journeys.map(({ ios }) => ios).sort();

if (JSON.stringify(androidScreenshots) !== JSON.stringify(expectedAndroid)) {
  failures.push(
    `Android curated inventory mismatch. Expected [${expectedAndroid.join(', ')}]; found [${androidScreenshots.join(', ')}].`,
  );
}
if (JSON.stringify(iosScreenshots) !== JSON.stringify(expectedIos)) {
  failures.push(
    `iOS curated inventory mismatch. Expected [${expectedIos.join(', ')}]; found [${iosScreenshots.join(', ')}].`,
  );
}

const seenHashes = new Map();
for (const [platform, files] of [
  ['android', expectedAndroid],
  ['ios', expectedIos],
]) {
  for (const file of files) {
    const relPath = `mobile/store-assets/screenshots/${platform}/curated/${file}`;
    const dimensions = readPngDimensions(relPath);
    if (!dimensions) {
      continue;
    }
    if (
      dimensions.width < 320 ||
      dimensions.height < 320 ||
      dimensions.width > 3840 ||
      dimensions.height > 3840 ||
      dimensions.height <= dimensions.width
    ) {
      failures.push(
        `${relPath} must be a portrait store screenshot with each edge between 320 and 3840 pixels; found ${dimensions.width}x${dimensions.height}.`,
      );
    }
    const existing = seenHashes.get(dimensions.sha256);
    if (existing) {
      failures.push(`${relPath} duplicates ${existing}; each journey must show distinct content.`);
    } else {
      seenHashes.set(dimensions.sha256, relPath);
    }
  }
}

if (androidScreenshots.length === 0 || iosScreenshots.length === 0) {
  warnings.push(
    'Signed Android and iOS release-candidate screenshots are intentionally absent; capture all five corresponding journeys before changing inventory status.',
  );
}

if (warnings.length > 0) {
  console.warn('Fastlane store asset warnings:');
  warnings.forEach((warning) => console.warn(`- ${warning}`));
}

if (failures.length > 0) {
  console.error('Fastlane store asset check failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  `Fastlane store asset check passed. Android curated screenshots: ${androidScreenshots.length}; iOS curated screenshots: ${iosScreenshots.length}.`,
);
