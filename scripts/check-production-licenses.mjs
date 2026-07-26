import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const packageRoot = resolve(process.argv[2] ?? 'backend');
const nodeModules = join(packageRoot, 'node_modules');

if (!existsSync(nodeModules)) {
  throw new Error(`Expected restored dependencies at ${nodeModules}; run npm ci first.`);
}

const packageDirectories = [];
for (const entry of readdirSync(nodeModules, { withFileTypes: true })) {
  if (!entry.isDirectory() || entry.name === '.bin') continue;
  if (entry.name.startsWith('@')) {
    for (const scopedEntry of readdirSync(join(nodeModules, entry.name), { withFileTypes: true })) {
      if (scopedEntry.isDirectory()) packageDirectories.push(join(nodeModules, entry.name, scopedEntry.name));
    }
  } else {
    packageDirectories.push(join(nodeModules, entry.name));
  }
}

const missing = packageDirectories.flatMap((directory) => {
  const manifestPath = join(directory, 'package.json');
  if (!existsSync(manifestPath)) return [];
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const hasDeclaredLicense =
    (typeof manifest.license === 'string' && manifest.license.trim()) ||
    (Array.isArray(manifest.licenses) && manifest.licenses.some((license) => license?.type?.trim()));
  return hasDeclaredLicense
    ? []
    : [manifest.name ?? directory];
});

if (missing.length > 0) {
  throw new Error(`Packages without a declared license: ${missing.sort().join(', ')}`);
}

console.log(`Validated declared licenses for ${packageDirectories.length} restored packages.`);
