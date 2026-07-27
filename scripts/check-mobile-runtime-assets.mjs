import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mobileRoot = path.join(repoRoot, 'mobile');
const failures = [];

function walk(directory, predicate = () => true) {
  if (!fs.existsSync(directory)) {
    return [];
  }
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return walk(entryPath, predicate);
    }
    return predicate(entryPath) ? [entryPath] : [];
  });
}

const pubspec = fs.readFileSync(path.join(mobileRoot, 'pubspec.yaml'), 'utf8');
const declaredAssets = [...pubspec.matchAll(/^\s{4}- (assets\/brand\/\S+)\s*$/gm)]
  .map((match) => match[1])
  .sort();

const dartFiles = walk(path.join(mobileRoot, 'lib'), (file) => file.endsWith('.dart'));
const referencedAssets = [
  ...new Set(
    dartFiles.flatMap((file) => {
      const source = fs.readFileSync(file, 'utf8');
      return [...source.matchAll(/['"](assets\/brand\/[^'"]+)['"]/g)].map(
        (match) => match[1],
      );
    }),
  ),
].sort();

for (const asset of declaredAssets) {
  if (asset.endsWith('/') || asset.includes('/source/') || asset.includes('/generated/')) {
    failures.push(`Flutter brand declaration is not a runtime file allowlist entry: ${asset}`);
  }
  if (!fs.existsSync(path.join(mobileRoot, asset))) {
    failures.push(`Declared Flutter asset is missing: ${asset}`);
  }
}

for (const asset of referencedAssets) {
  if (!declaredAssets.includes(asset)) {
    failures.push(`Dart references an undeclared brand asset: ${asset}`);
  }
}
for (const asset of declaredAssets) {
  if (!referencedAssets.includes(asset)) {
    failures.push(`Flutter bundles an unreferenced brand asset: ${asset}`);
  }
}

const builtAssetsDir = path.join(mobileRoot, 'build/flutter_assets/assets/brand');
if (process.argv.includes('--built')) {
  if (!fs.existsSync(builtAssetsDir)) {
    failures.push('Built Flutter asset directory is absent; run flutter build bundle first.');
  } else {
    const builtAssets = walk(builtAssetsDir).map((file) =>
      path
        .relative(path.join(mobileRoot, 'build/flutter_assets'), file)
        .split(path.sep)
        .join('/'),
    );
    const unexpected = builtAssets.filter((asset) => !declaredAssets.includes(asset));
    const missing = declaredAssets.filter((asset) => !builtAssets.includes(asset));
    unexpected.forEach((asset) => failures.push(`Unexpected built brand asset: ${asset}`));
    missing.forEach((asset) => failures.push(`Missing built brand asset: ${asset}`));
  }
}

const trackedArtworkFiles = [
  ...walk(path.join(mobileRoot, 'assets/brand')),
  ...walk(path.join(mobileRoot, 'store-assets/design')),
];
const trackedArtworkBytes = trackedArtworkFiles.reduce(
  (total, file) => total + fs.statSync(file).size,
  0,
);
const runtimeBytes = declaredAssets.reduce(
  (total, asset) => total + (fs.existsSync(path.join(mobileRoot, asset)) ? fs.statSync(path.join(mobileRoot, asset)).size : 0),
  0,
);

if (failures.length > 0) {
  console.error('Mobile runtime asset validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  `Mobile runtime asset validation passed: ${declaredAssets.length} files, ${runtimeBytes} bundled source bytes of ${trackedArtworkBytes} tracked artwork bytes.`,
);
