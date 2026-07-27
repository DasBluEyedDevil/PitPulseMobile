import fs from 'node:fs';

export const ANDROID_PACKAGE_NAME = 'com.soundcheck.app';
export const IOS_APP_ID = 'BDJDR669ZV.com.9thlevelsoftware.soundcheck';
export const ANDROID_RELATION = 'delegate_permission/common.handle_all_urls';
export const RESET_PATHS = ['/reset-password', '/reset-password/*'];

export function normalizeSha256Fingerprint(value) {
  const compact = String(value ?? '')
    .trim()
    .replaceAll(':', '')
    .toUpperCase();

  if (!/^[0-9A-F]{64}$/.test(compact)) {
    throw new Error(
      'The verified Android app-signing SHA-256 fingerprint must contain exactly 64 hexadecimal characters.',
    );
  }

  return compact.match(/.{2}/g).join(':');
}

export function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${label}: ${filePath}`);
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
}

export function validateAasa(document) {
  const details = document?.applinks?.details;
  if (!Array.isArray(document?.applinks?.apps) || document.applinks.apps.length !== 0) {
    throw new Error('AASA applinks.apps must be an empty array.');
  }
  if (!Array.isArray(details) || details.length !== 1) {
    throw new Error('AASA must contain exactly one applinks.details entry.');
  }

  const entry = details[0];
  if (entry.appID !== IOS_APP_ID) {
    throw new Error(`AASA appID must be ${IOS_APP_ID}; found ${String(entry.appID)}.`);
  }
  if (
    !Array.isArray(entry.paths) ||
    entry.paths.length !== RESET_PATHS.length ||
    RESET_PATHS.some((path) => !entry.paths.includes(path))
  ) {
    throw new Error(`AASA paths must be exactly: ${RESET_PATHS.join(', ')}.`);
  }
}

export function validateAssetlinks(document, expectedFingerprint) {
  if (!Array.isArray(document) || document.length !== 1) {
    throw new Error('assetlinks.json must contain exactly one statement.');
  }

  const statement = document[0];
  if (
    !Array.isArray(statement.relation) ||
    statement.relation.length !== 1 ||
    statement.relation[0] !== ANDROID_RELATION
  ) {
    throw new Error(`assetlinks.json relation must be ${ANDROID_RELATION}.`);
  }

  const target = statement.target;
  if (target?.namespace !== 'android_app') {
    throw new Error('assetlinks.json target namespace must be android_app.');
  }
  if (target.package_name !== ANDROID_PACKAGE_NAME) {
    throw new Error(
      `assetlinks.json package_name must be ${ANDROID_PACKAGE_NAME}; found ${String(target.package_name)}.`,
    );
  }

  const fingerprints = target.sha256_cert_fingerprints;
  if (!Array.isArray(fingerprints) || fingerprints.length !== 1) {
    throw new Error('assetlinks.json must contain exactly one SHA-256 app-signing fingerprint.');
  }
  const actualFingerprint = normalizeSha256Fingerprint(fingerprints[0]);
  if (actualFingerprint !== fingerprints[0]) {
    throw new Error('assetlinks.json fingerprint must use uppercase colon-delimited SHA-256 form.');
  }

  if (
    expectedFingerprint &&
    actualFingerprint !== normalizeSha256Fingerprint(expectedFingerprint)
  ) {
    throw new Error(
      'assetlinks.json does not match SOUNDCHECK_ANDROID_VERIFIED_APP_SIGNING_SHA256.',
    );
  }

  return actualFingerprint;
}

export function createAssetlinksDocument(fingerprint) {
  return [
    {
      relation: [ANDROID_RELATION],
      target: {
        namespace: 'android_app',
        package_name: ANDROID_PACKAGE_NAME,
        sha256_cert_fingerprints: [normalizeSha256Fingerprint(fingerprint)],
      },
    },
  ];
}
