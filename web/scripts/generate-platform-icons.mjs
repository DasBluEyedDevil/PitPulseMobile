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
const provenanceDir = path.join(repoRoot, 'mobile/store-assets/app-icons');
const background = '#030713';
const densityScales = new Map([
  ['mdpi', 1],
  ['hdpi', 1.5],
  ['xhdpi', 2],
  ['xxhdpi', 3],
  ['xxxhdpi', 4],
]);

if (!fs.existsSync(sourcePath)) {
  console.error(`Missing canonical icon source: ${sourcePath}`);
  process.exit(1);
}

function roundPixels(value) {
  return Math.round(value);
}

async function trimmedSource() {
  return sharp(sourcePath)
    .ensureAlpha()
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
}

async function scaledMark(source, width, height = width) {
  return sharp(source)
    .resize({
      width: roundPixels(width),
      height: roundPixels(height),
      fit: 'inside',
      kernel: sharp.kernel.lanczos3,
    })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
}

async function writeOpaqueIcon(source, size, outputPath, markFraction = 0.62) {
  const mark = await scaledMark(source, size * markFraction, size * markFraction);
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([{ input: mark, gravity: 'centre' }])
    .removeAlpha()
    .png({ compressionLevel: 9, palette: false })
    .toFile(outputPath);
}

async function writeAdaptiveForeground(source, size, outputPath) {
  const safeMarkSize = (size * 48) / 108;
  const mark = await scaledMark(source, safeMarkSize, safeMarkSize);
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: mark, gravity: 'centre' }])
    .png({ compressionLevel: 9, palette: false })
    .toFile(outputPath);
}

async function generateAndroid(source) {
  for (const [density, scale] of densityScales) {
    const outputDir = path.join(androidRes, `mipmap-${density}`);
    fs.mkdirSync(outputDir, { recursive: true });
    const legacySize = roundPixels(48 * scale);
    const adaptiveSize = roundPixels(108 * scale);

    await writeOpaqueIcon(source, legacySize, path.join(outputDir, 'ic_launcher.png'));
    await writeOpaqueIcon(
      source,
      legacySize,
      path.join(outputDir, 'ic_launcher_round.png'),
      0.56,
    );
    await writeAdaptiveForeground(
      source,
      adaptiveSize,
      path.join(outputDir, 'ic_launcher_foreground.png'),
    );
  }
}

async function generateIos(source) {
  const catalog = JSON.parse(
    fs.readFileSync(path.join(iosCatalog, 'Contents.json'), 'utf8'),
  );

  for (const image of catalog.images) {
    if (!image.filename) {
      continue;
    }
    const pointSize = Number.parseFloat(image.size.split('x')[0]);
    const scale = Number.parseFloat(image.scale);
    const pixelSize = roundPixels(pointSize * scale);
    await writeOpaqueIcon(
      source,
      pixelSize,
      path.join(iosCatalog, image.filename),
      0.62,
    );
  }
}

async function main() {
  const source = await trimmedSource();
  await generateAndroid(source);
  await generateIos(source);

  fs.mkdirSync(provenanceDir, { recursive: true });
  const sourceSha256 = crypto
    .createHash('sha256')
    .update(fs.readFileSync(sourcePath))
    .digest('hex');
  const provenance = {
    schemaVersion: 1,
    source: 'mobile/assets/brand/flash/flash_mark_cutout.png',
    sourceSha256,
    generator: 'web/scripts/generate-platform-icons.mjs',
    generatorDependency: 'sharp@0.34.5',
    background,
    android: {
      packageName: 'com.soundcheck.app',
      adaptiveCanvasDp: 108,
      adaptiveMarkBoundsDp: 48,
      adaptiveSafeZoneDiameterDp: 66,
      legacyCanvasDp: 48,
    },
    ios: {
      bundleIdentifier: 'com.9thlevelsoftware.soundcheck',
      opaque: true,
    },
  };
  fs.writeFileSync(
    path.join(provenanceDir, 'icon-generation.json'),
    `${JSON.stringify(provenance, null, 2)}\n`,
    'utf8',
  );

  console.log('Generated Android adaptive/legacy and iOS catalog icons from the flash mark.');
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
