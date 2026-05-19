/**
 * Trim and normalize official store badges to the same rendered height.
 * Run from web/: node scripts/optimize-store-badges.mjs
 */
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const storeDir = join(root, 'public', 'store');
const targetHeight = 48;

async function trimToContent(inputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * channels;
      const alpha = channels === 4 ? data[i + 3] : 255;
      if (alpha > 8) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    throw new Error(`No visible pixels in ${inputPath}`);
  }

  return sharp(inputPath).extract({
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  });
}

async function normalizeBadge(inputName, outputName) {
  const inputPath = join(storeDir, inputName);
  const outputPath = join(storeDir, outputName);
  const trimmed = await trimToContent(inputPath);
  const meta = await trimmed.metadata();

  await trimmed
    .resize({
      height: targetHeight,
      withoutEnlargement: false,
    })
    .png()
    .toFile(outputPath);

  const outMeta = await sharp(outputPath).metadata();
  console.log(
    `${inputName} -> ${outputName}: ${meta.width}x${meta.height} trimmed -> ${outMeta.width}x${outMeta.height}`,
  );
}

await normalizeBadge('google-play-badge.png', 'google-play.png');
await normalizeBadge('app-store-badge.svg', 'app-store.png');
