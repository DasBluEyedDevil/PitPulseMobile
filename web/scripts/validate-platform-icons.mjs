import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '../..');
const sourcePath = path.join(
  repoRoot,
  'mobile/assets/brand/flash/flash_mark_cutout.png',
);
const androidRes = path.join(repoRoot, 'mobile/android/app/src/main/res');
const iosCatalog = path.join(
  repoRoot,
  'mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset',
);
const provenancePath = path.join(
  repoRoot,
  'mobile/store-assets/app-icons/icon-generation.json',
);
const densityScales = new Map([
  ['mdpi', 1],
  ['hdpi', 1.5],
  ['xhdpi', 2],
  ['xxhdpi', 3],
  ['xxxhdpi', 4],
]);
const failures = [];

async function checkPng(filePath, expectedSize, mustBeOpaque) {
  if (!fs.existsSync(filePath)) {
    failures.push(`Missing ${path.relative(repoRoot, filePath)}`);
    return;
  }

  const image = sharp(filePath);
  const metadata = await image.metadata();
  if (
    metadata.format !== 'png' ||
    metadata.width !== expectedSize ||
    metadata.height !== expectedSize
  ) {
    failures.push(
      `${path.relative(repoRoot, filePath)} must be an ${expectedSize}x${expectedSize} PNG.`,
    );
  }

  if (mustBeOpaque) {
    const stats = await image.stats();
    if (!stats.isOpaque) {
      failures.push(`${path.relative(repoRoot, filePath)} must not contain transparency.`);
    }
  }
}

async function checkAdaptiveSafeZone(filePath, expectedSize) {
  await checkPng(filePath, expectedSize, false);
  if (!fs.existsSync(filePath)) {
    return;
  }

  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const centreX = (info.width - 1) / 2;
  const centreY = (info.height - 1) / 2;
  const safeRadius = (info.width * 33) / 108 + 1.5;
  const alphaIndex = info.channels - 1;
  let nonTransparentPixels = 0;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * info.channels + alphaIndex];
      if (alpha === 0) {
        continue;
      }
      nonTransparentPixels += 1;
      if (Math.hypot(x - centreX, y - centreY) > safeRadius) {
        failures.push(
          `${path.relative(repoRoot, filePath)} has foreground pixels outside the 66dp adaptive safe zone.`,
        );
        return;
      }
    }
  }

  if (nonTransparentPixels === 0) {
    failures.push(`${path.relative(repoRoot, filePath)} has an empty foreground layer.`);
  }
}

async function main() {
  for (const [density, scale] of densityScales) {
    const directory = path.join(androidRes, `mipmap-${density}`);
    await checkPng(path.join(directory, 'ic_launcher.png'), Math.round(48 * scale), true);
    await checkPng(
      path.join(directory, 'ic_launcher_round.png'),
      Math.round(48 * scale),
      true,
    );
    await checkAdaptiveSafeZone(
      path.join(directory, 'ic_launcher_foreground.png'),
      Math.round(108 * scale),
    );
  }

  for (const name of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
    const xmlPath = path.join(androidRes, 'mipmap-anydpi-v26', name);
    if (!fs.existsSync(xmlPath)) {
      failures.push(`Missing ${path.relative(repoRoot, xmlPath)}`);
    } else {
      const xml = fs.readFileSync(xmlPath, 'utf8');
      if (
        !xml.includes('@color/ic_launcher_background') ||
        !xml.includes('@mipmap/ic_launcher_foreground')
      ) {
        failures.push(`${path.relative(repoRoot, xmlPath)} has incorrect adaptive layers.`);
      }
    }
  }

  const catalog = JSON.parse(
    fs.readFileSync(path.join(iosCatalog, 'Contents.json'), 'utf8'),
  );
  const iosIconFiles = new Set();
  for (const image of catalog.images) {
    if (!image.filename) {
      failures.push(`iOS icon entry ${image.idiom} ${image.size} ${image.scale} has no filename.`);
      continue;
    }
    iosIconFiles.add(image.filename);
    const pointSize = Number.parseFloat(image.size.split('x')[0]);
    const scale = Number.parseFloat(image.scale);
    await checkPng(
      path.join(iosCatalog, image.filename),
      Math.round(pointSize * scale),
      true,
    );
  }

  if (!fs.existsSync(provenancePath)) {
    failures.push(`Missing ${path.relative(repoRoot, provenancePath)}`);
  } else {
    const provenance = JSON.parse(fs.readFileSync(provenancePath, 'utf8'));
    const actualSourceSha256 = crypto
      .createHash('sha256')
      .update(fs.readFileSync(sourcePath))
      .digest('hex');
    if (provenance.sourceSha256 !== actualSourceSha256) {
      failures.push('Icon provenance does not match the canonical flash mark.');
    }
    if (provenance.android?.packageName !== 'com.soundcheck.app') {
      failures.push('Icon provenance has the wrong Android package identity.');
    }
    if (provenance.ios?.bundleIdentifier !== 'com.9thlevelsoftware.soundcheck') {
      failures.push('Icon provenance has the wrong iOS bundle identity.');
    }
  }

  if (failures.length > 0) {
    console.error('Platform icon validation failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log(
    `Platform icon validation passed: Android 15 PNGs + 2 adaptive XMLs; iOS ${catalog.images.length} catalog entries across ${iosIconFiles.size} opaque PNGs.`,
  );
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
