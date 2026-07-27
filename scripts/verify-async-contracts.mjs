import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(repositoryRoot, 'docs/contracts/async-contracts.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const failures = [];

function normalized(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function readRepositoryFile(relativePath) {
  const absolutePath = path.resolve(repositoryRoot, relativePath);
  const relativeResolved = path.relative(repositoryRoot, absolutePath);
  if (
    relativeResolved.startsWith('..') ||
    path.isAbsolute(relativeResolved) ||
    !fs.existsSync(absolutePath)
  ) {
    failures.push(`Missing or invalid evidence path: ${relativePath}`);
    return '';
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

function extractBackendWebSocketEvents(source) {
  const block = source.match(/export const WebSocketEvents = \{([\s\S]*?)\};/);
  if (!block) {
    failures.push('Unable to locate backend WebSocketEvents contract.');
    return [];
  }
  return [...block[1].matchAll(/^\s*[A-Z0-9_]+:\s*'([^']+)'/gm)].map((match) => match[1]);
}

function extractMobileWebSocketEvents(source) {
  const block = source.match(/class WebSocketEvents \{([\s\S]*?)^\}/m);
  if (!block) {
    failures.push('Unable to locate mobile WebSocketEvents contract.');
    return [];
  }
  return [...block[1].matchAll(/static const String \w+ = '([^']+)'/g)].map(
    (match) => match[1]
  );
}

function reportDuplicates(label, values) {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
  if (duplicates.length > 0) {
    failures.push(`${label} contains duplicate values: ${[...new Set(duplicates)].join(', ')}`);
  }
}

if (manifest.schemaVersion !== 1) {
  failures.push(`Unsupported async contract schema: ${manifest.schemaVersion}`);
}
if (!Array.isArray(manifest.contracts) || manifest.contracts.length === 0) {
  failures.push('Async contract manifest must contain at least one contract.');
}

const contractIds = new Set();
const kinds = new Set();
for (const contract of manifest.contracts ?? []) {
  if (!contract.id || contractIds.has(contract.id)) {
    failures.push(`Missing or duplicate async contract id: ${contract.id ?? '<missing>'}`);
    continue;
  }
  contractIds.add(contract.id);
  kinds.add(contract.kind);

  const roles = new Set();
  if (!Array.isArray(contract.evidence) || contract.evidence.length === 0) {
    failures.push(`${contract.id} has no evidence.`);
    continue;
  }

  for (const evidence of contract.evidence) {
    roles.add(evidence.role);
    const contents = readRepositoryFile(evidence.file);
    const normalizedContents = normalized(contents);
    for (const fragment of evidence.contains ?? []) {
      if (!normalizedContents.includes(normalized(fragment))) {
        failures.push(
          `${contract.id} ${evidence.role} evidence missing from ${evidence.file}: ${fragment}`
        );
      }
    }
  }

  for (const requiredRole of ['producer', 'consumer', 'test']) {
    if (!roles.has(requiredRole)) {
      failures.push(`${contract.id} is missing ${requiredRole} evidence.`);
    }
  }
}

for (const requiredKind of ['websocket', 'push', 'email-link', 'queue', 'webhook', 'sharing']) {
  if (!kinds.has(requiredKind)) {
    failures.push(`Async contract manifest has no ${requiredKind} contract.`);
  }
}

const backendEvents = extractBackendWebSocketEvents(
  readRepositoryFile('backend/src/utils/websocket.ts')
);
const mobileEvents = extractMobileWebSocketEvents(
  readRepositoryFile('mobile/lib/src/core/services/websocket_service.dart')
);
reportDuplicates('Backend WebSocketEvents', backendEvents);
reportDuplicates('Mobile WebSocketEvents', mobileEvents);
for (const eventName of backendEvents) {
  if (!mobileEvents.includes(eventName)) {
    failures.push(`Mobile WebSocketEvents does not consume backend event "${eventName}".`);
  }
}

if (failures.length > 0) {
  console.error('Async contract verification failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Async contract verification passed: ${contractIds.size} contracts across ${kinds.size} kinds; ${backendEvents.length} backend WebSocket events are mobile-consumable.`
  );
}
