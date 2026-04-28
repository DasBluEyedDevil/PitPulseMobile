import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const requiredFiles = [
  'AGENTS.md',
  'docs/agent/README.md',
  'docs/agent/ARCHITECTURE.md',
  'docs/agent/CONVENTIONS.md',
  'docs/agent/TESTING.md',
  'docs/agent/HARNESS.md',
  'docs/agent/QUALITY.md',
  'docs/agent/PLANS.md',
  '.github/workflows/ci.yml',
];

const failures = [];

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

for (const file of requiredFiles) {
  if (!existsSync(path.join(root, file))) {
    failures.push(`Missing required agent harness file: ${file}`);
  }
}

if (existsSync(path.join(root, 'AGENTS.md'))) {
  const agents = read('AGENTS.md');
  const lineCount = agents.trimEnd().split(/\r?\n/).length;
  if (lineCount > 140) {
    failures.push(`AGENTS.md is ${lineCount} lines; keep it at or below 140 lines.`);
  }

  for (const target of [
    'docs/agent/README.md',
    'docs/agent/ARCHITECTURE.md',
    'docs/agent/CONVENTIONS.md',
    'docs/agent/TESTING.md',
    'docs/agent/HARNESS.md',
    'docs/agent/QUALITY.md',
    'docs/agent/PLANS.md',
  ]) {
    if (!agents.includes(target)) {
      failures.push(`AGENTS.md does not point to ${target}.`);
    }
  }
}

if (existsSync(path.join(root, '.gitignore'))) {
  const ignoredKnowledge = read('.gitignore')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line === '/docs/' || line === '/.planning/');

  if (ignoredKnowledge.length > 0) {
    failures.push(`Tracked knowledge paths must not be ignored: ${ignoredKnowledge.join(', ')}`);
  }
}

try {
  const ignoredTracked = execFileSync('git', ['ls-files', '-ci', '--exclude-standard'], {
    cwd: root,
    encoding: 'utf8',
  })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);

  if (ignoredTracked.length > 0) {
    failures.push(
      [
        'Tracked files are currently ignored by gitignore rules:',
        ...ignoredTracked.slice(0, 20).map((file) => `  - ${file}`),
        ignoredTracked.length > 20 ? `  ...and ${ignoredTracked.length - 20} more` : '',
      ]
        .filter(Boolean)
        .join('\n')
    );
  }

  const trackedDist = execFileSync('git', ['ls-files', 'backend/dist'], {
    cwd: root,
    encoding: 'utf8',
  })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);

  if (trackedDist.length > 0) {
    failures.push('backend/dist is generated build output and must not be tracked.');
  }
} catch (error) {
  failures.push(`Unable to run git harness checks: ${error.message}`);
}

if (failures.length > 0) {
  console.error(failures.join('\n\n'));
  process.exit(1);
}

console.log('Agent harness checks passed.');
