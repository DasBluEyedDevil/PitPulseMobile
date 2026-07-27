import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = path.resolve(backendRoot, '..');
const contractPath = path.join(repositoryRoot, 'docs/contracts/http-route-contract.json');
const routesRoot = path.join(backendRoot, 'src/routes');
const indexPath = path.join(backendRoot, 'src/index.ts');
const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
const httpMethods = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'all']);
const failures = [];

function sourceFileFor(sourcePath) {
  const contents = fs.readFileSync(sourcePath, 'utf8');
  return {
    contents,
    sourceFile: ts.createSourceFile(
      sourcePath,
      contents,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    ),
  };
}

function lineOf(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function joinRoutePath(basePath, localPath) {
  if (localPath === '/') {
    return basePath;
  }
  return `${basePath.replace(/\/$/, '')}/${localPath.replace(/^\//, '')}`;
}

function signatureHash(routes) {
  return crypto
    .createHash('sha256')
    .update(
      routes
        .map((route) => `${route.method} ${route.localPath}`)
        .sort()
        .join('\n')
    )
    .digest('hex');
}

function extractRouteGroups() {
  const groups = new Map();
  const routeFiles = fs
    .readdirSync(routesRoot)
    .filter((fileName) => fileName.endsWith('.ts'))
    .sort();

  for (const fileName of routeFiles) {
    const sourcePath = path.join(routesRoot, fileName);
    const relativeSourcePath = `src/routes/${fileName}`;
    const { sourceFile } = sourceFileFor(sourcePath);
    const routerWideMiddleware = new Map();

    function visitMiddleware(node) {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 'use'
      ) {
        const routerName = node.expression.expression.getText(sourceFile);
        const middleware = node.arguments
          .map((argument) => argument.getText(sourceFile))
          .join(', ');
        routerWideMiddleware.set(
          routerName,
          `${routerWideMiddleware.get(routerName) ?? ''}, ${middleware}`
        );
      }
      ts.forEachChild(node, visitMiddleware);
    }
    visitMiddleware(sourceFile);

    function visitRoutes(node) {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        httpMethods.has(node.expression.name.text)
      ) {
        const pathArgument = node.arguments[0];
        if (pathArgument && ts.isStringLiteralLike(pathArgument)) {
          const routerName = node.expression.expression.getText(sourceFile);
          const groupKey = `${relativeSourcePath}#${routerName}`;
          const handlerArguments = node.arguments
            .slice(1)
            .map((argument) => argument.getText(sourceFile));
          const route = {
            groupKey,
            method: node.expression.name.text.toUpperCase(),
            localPath: pathArgument.text,
            line: lineOf(sourceFile, node),
            handlerArguments,
            routerWideMiddleware: routerWideMiddleware.get(routerName) ?? '',
          };
          const routes = groups.get(groupKey) ?? [];
          routes.push(route);
          groups.set(groupKey, routes);
        }
      }
      ts.forEachChild(node, visitRoutes);
    }
    visitRoutes(sourceFile);
  }

  return groups;
}

function extractIndexContract() {
  const { sourceFile } = sourceFileFor(indexPath);
  const mounts = new Set();
  const directRoutes = new Map();

  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.getText(sourceFile) === 'app'
    ) {
      const method = node.expression.name.text;
      const pathArgument = node.arguments[0];
      if (pathArgument && ts.isStringLiteralLike(pathArgument)) {
        if (method === 'use' && node.arguments[1]) {
          mounts.add(`${pathArgument.text}|${node.arguments[1].getText(sourceFile)}`);
        } else if (httpMethods.has(method)) {
          const signature = `${method.toUpperCase()} ${pathArgument.text}`;
          directRoutes.set(signature, {
            line: lineOf(sourceFile, node),
            handlerArguments: node.arguments
              .slice(1)
              .map((argument) => argument.getText(sourceFile)),
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return { directRoutes, mounts };
}

function deriveAuthentication(route, groupContract, signature) {
  if (groupContract.authenticationOverrides?.[signature]) {
    return groupContract.authenticationOverrides[signature];
  }
  const middleware = `${route.routerWideMiddleware}, ${route.handlerArguments.join(', ')}`;
  if (middleware.includes('requireAdmin')) {
    return 'administrator';
  }
  if (middleware.includes('authenticateToken')) {
    return 'authenticated';
  }
  if (middleware.includes('optionalAuth')) {
    return 'optional authentication';
  }
  return 'public';
}

function deriveValidation(route) {
  const routeSource = route.handlerArguments.join(', ');
  const routeSchemas = [...routeSource.matchAll(/validate\((\w+)\)/g)].map((match) => match[1]);
  if (routeSchemas.length > 0) {
    return {
      validation: `route Zod: ${routeSchemas.join(', ')}`,
      requestModel: routeSchemas.join(', '),
    };
  }

  const inlineSchemas = [...routeSource.matchAll(/(\w+Schema)\.safeParse\(/g)].map(
    (match) => match[1]
  );
  if (inlineSchemas.length > 0) {
    return {
      validation: `inline Zod: ${[...new Set(inlineSchemas)].join(', ')}`,
      requestModel: [...new Set(inlineSchemas)].join(', '),
    };
  }

  const hasInput =
    route.method !== 'GET' ||
    route.localPath.includes(':') ||
    routeSource.includes('req.query') ||
    routeSource.includes('req.body');
  return {
    validation: hasInput
      ? 'handler-defined or absent; no route Zod evidence'
      : 'no structured input',
    requestModel: hasInput ? 'handler-defined' : 'none',
  };
}

function finalHandler(route) {
  return route.handlerArguments.at(-1)?.replace(/\s+/g, ' ').slice(0, 160) ?? 'missing';
}

if (contract.schemaVersion !== 1) {
  failures.push(`Unsupported HTTP route contract schema: ${contract.schemaVersion}`);
}

const allowedClassifications = new Set(contract.allowedClassifications);
for (const semanticField of [
  'canonicalErrors',
  'statusEvidence',
  'requestModelEvidence',
  'responseModelEvidence',
  'effectsEvidence',
]) {
  if (!contract.semantics?.[semanticField]) {
    failures.push(`HTTP contract is missing semantics.${semanticField}.`);
  }
}
const extractedGroups = extractRouteGroups();
const { directRoutes, mounts } = extractIndexContract();
const rows = [];

for (const [groupKey, routes] of extractedGroups) {
  const groupContract = contract.routeGroups[groupKey];
  if (!groupContract) {
    failures.push(`Unclassified Express route group: ${groupKey}`);
    continue;
  }
  if (!allowedClassifications.has(groupContract.classification)) {
    failures.push(
      `Route group ${groupKey} has invalid classification "${groupContract.classification}".`
    );
  }
  if (routes.length !== groupContract.expectedEndpointCount) {
    failures.push(
      `${groupKey} has ${routes.length} endpoints; contract expects ${groupContract.expectedEndpointCount}.`
    );
  }
  const actualHash = signatureHash(routes);
  if (actualHash !== groupContract.signatureSha256) {
    failures.push(
      `${groupKey} signature drift: ${actualHash} does not match ${groupContract.signatureSha256}.`
    );
  }
  const mountSignature = `${groupContract.mountPath}|${groupContract.mountExpression}`;
  if (!mounts.has(mountSignature)) {
    failures.push(`Missing or changed Express mount: ${mountSignature}`);
  }

  for (const route of routes) {
    const localSignature = `${route.method} ${route.localPath}`;
    const classification =
      groupContract.classificationOverrides?.[localSignature] ?? groupContract.classification;
    if (!allowedClassifications.has(classification)) {
      failures.push(`${groupKey} ${localSignature} does not resolve to a valid classification.`);
    }
    const validation = deriveValidation(route);
    rows.push({
      signature: `${route.method} ${joinRoutePath(groupContract.mountPath, route.localPath)}`,
      classification,
      authentication: deriveAuthentication(route, groupContract, localSignature),
      validation: validation.validation,
      requestModel: validation.requestModel,
      responseModel:
        groupContract.responseModel ??
        (classification === 'public' ? 'public HTML response' : 'ApiResponse/domain DTO'),
      statusEvidence: `${groupKey.split('#')[0]}:${route.line} and final handler`,
      effectsOwner: finalHandler(route),
    });
  }
}

for (const groupKey of Object.keys(contract.routeGroups)) {
  if (!extractedGroups.has(groupKey)) {
    failures.push(`Contract route group no longer exists: ${groupKey}`);
  }
}

for (const [signature, route] of directRoutes) {
  const directContract = contract.directRoutes[signature];
  if (!directContract) {
    failures.push(`Unclassified direct Express route: ${signature}`);
    continue;
  }
  if (!allowedClassifications.has(directContract.classification)) {
    failures.push(
      `Direct route ${signature} has invalid classification "${directContract.classification}".`
    );
  }
  rows.push({
    signature,
    classification: directContract.classification,
    authentication: directContract.authentication,
    validation: 'direct route source',
    requestModel: 'none',
    responseModel: signature.includes('debug/sentry-test') ? 'intentional error' : 'ApiResponse',
    statusEvidence: `src/index.ts:${route.line}`,
    effectsOwner: route.handlerArguments.at(-1)?.replace(/\s+/g, ' ').slice(0, 160) ?? 'missing',
  });
}

for (const signature of Object.keys(contract.directRoutes)) {
  if (!directRoutes.has(signature)) {
    failures.push(`Contract direct route no longer exists: ${signature}`);
  }
}

for (const retired of contract.deliberatelyRemoved) {
  if (!retired.signature || !retired.replacement || !retired.evidence) {
    failures.push('A deliberately removed route is missing signature, replacement, or evidence.');
    continue;
  }
  if (retired.signature.includes('/api/reviews/')) {
    const active = rows.some((row) => row.signature.includes('/api/reviews/'));
    if (active) {
      failures.push(`Deliberately removed route became active: ${retired.signature}`);
    }
  }
  if (retired.signature.includes('/api/shows/')) {
    const active = rows.some((row) => row.signature.includes('/api/shows/'));
    if (active) {
      failures.push(`Deliberately removed route became active: ${retired.signature}`);
    }
  }
  if (retired.signature === 'GET /uploads/*') {
    const active = rows.some(
      (row) => row.signature.startsWith('GET /uploads/') && !row.signature.startsWith('GET /api/')
    );
    if (active) {
      failures.push(`Deliberately removed route became active: ${retired.signature}`);
    }
  }
}

const duplicateSignatures = [...new Set(rows.map((row) => row.signature))].filter(
  (signature) => rows.filter((row) => row.signature === signature).length > 1
);
if (duplicateSignatures.length > 0) {
  failures.push(`Duplicate mounted HTTP signatures: ${duplicateSignatures.join(', ')}`);
}

for (const row of rows) {
  for (const requiredField of [
    'signature',
    'classification',
    'authentication',
    'validation',
    'requestModel',
    'responseModel',
    'statusEvidence',
    'effectsOwner',
  ]) {
    if (!row[requiredField]) {
      failures.push(`${row.signature || 'Unknown route'} is missing ${requiredField}.`);
    }
  }
}

const classificationCounts = rows.reduce((counts, row) => {
  counts[row.classification] = (counts[row.classification] ?? 0) + 1;
  return counts;
}, {});
classificationCounts['deliberately removed'] = contract.deliberatelyRemoved.length;

console.log(
  `HTTP route contract rows: ${rows.length} active, ${contract.deliberatelyRemoved.length} deliberately removed.`
);
for (const classification of contract.allowedClassifications) {
  console.log(`- ${classification}: ${classificationCounts[classification] ?? 0}`);
}

if (process.argv.includes('--list')) {
  for (const row of rows.sort((left, right) => left.signature.localeCompare(right.signature))) {
    console.log(
      `${row.signature} | ${row.classification} | ${row.authentication} | ${row.validation} | ${row.requestModel} | ${row.responseModel} | ${row.statusEvidence} | ${row.effectsOwner}`
    );
  }
}

if (failures.length > 0) {
  console.error('\nHTTP route contract gate failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log('HTTP route contract gate passed.');
}
