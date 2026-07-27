import { copyFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const assets = [
  ['src/fonts/Inter-Bold.ttf', 'dist/fonts/Inter-Bold.ttf'],
  ['src/fonts/LICENSE.txt', 'dist/fonts/LICENSE.txt'],
  ['src/fonts/PROVENANCE.md', 'dist/fonts/PROVENANCE.md'],
  ['src/templates/share-cards/landing-page.html', 'dist/templates/share-cards/landing-page.html'],
];

for (const [source, destination] of assets) {
  const sourcePath = path.join(backendRoot, source);
  const destinationPath = path.join(backendRoot, destination);
  mkdirSync(path.dirname(destinationPath), { recursive: true });
  copyFileSync(sourcePath, destinationPath);
}
