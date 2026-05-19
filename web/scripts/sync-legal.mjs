import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, '../..');
const legalDir = resolve(currentDir, '../src/content/legal');

mkdirSync(legalDir, { recursive: true });

const files = [
  {
    source: 'PRIVACY_POLICY.md',
    dest: 'privacy.md',
    title: 'Privacy Policy',
  },
  {
    source: 'TERMS_OF_SERVICE.md',
    dest: 'terms.md',
    title: 'Terms of Service',
  },
];

for (const { source, dest, title } of files) {
  const body = readFileSync(resolve(repoRoot, source), 'utf8');
  const frontmatter = `---\ntitle: "${title}"\n---\n\n`;
  writeFileSync(resolve(legalDir, dest), frontmatter + body);
}

console.log('Synced legal markdown to src/content/legal/');
