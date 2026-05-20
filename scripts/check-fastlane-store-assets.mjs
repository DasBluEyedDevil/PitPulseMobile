import fs from 'node:fs';
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

const androidScreenshots = pngFiles('mobile/store-assets/screenshots/android/curated');
if (androidScreenshots.length < 2 || androidScreenshots.length > 8) {
  failures.push(
    `Android curated phone screenshots must contain 2-8 PNG files; found ${androidScreenshots.length}`,
  );
}

const iosScreenshots = pngFiles('mobile/store-assets/screenshots/ios/curated');
if (iosScreenshots.length === 0) {
  warnings.push(
    'No curated iOS screenshots found yet. Add PNGs under mobile/store-assets/screenshots/ios/curated or run the iOS snapshot lane on macOS before App Store screenshot upload.',
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
