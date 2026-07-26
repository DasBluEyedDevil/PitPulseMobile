import { copyFileSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const androidReleaseInputNames = [
  'SOUNDCHECK_GOOGLE_SERVICES_JSON_PATH',
  'SOUNDCHECK_ANDROID_KEYSTORE_PATH',
  'SOUNDCHECK_ANDROID_KEYSTORE_PASSWORD',
  'SOUNDCHECK_ANDROID_KEY_ALIAS',
  'SOUNDCHECK_ANDROID_KEY_PASSWORD',
];

function requiredEnvironment(environment) {
  const missing = androidReleaseInputNames.filter((name) => !environment[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`Android release requires: ${missing.join(', ')}`);
  }
}

function requiredFile(value, name) {
  const path = resolve(value);
  if (!existsSync(path) || !statSync(path).isFile()) {
    throw new Error(`${name} must reference a readable file`);
  }
  return path;
}

export function prepareAndroidRelease({ environment = process.env, repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..') } = {}) {
  requiredEnvironment(environment);

  const googleServicesSource = requiredFile(
    environment.SOUNDCHECK_GOOGLE_SERVICES_JSON_PATH,
    'SOUNDCHECK_GOOGLE_SERVICES_JSON_PATH',
  );
  requiredFile(environment.SOUNDCHECK_ANDROID_KEYSTORE_PATH, 'SOUNDCHECK_ANDROID_KEYSTORE_PATH');

  const googleServicesDestination = resolve(repositoryRoot, 'mobile/android/app/google-services.json');
  copyFileSync(googleServicesSource, googleServicesDestination);
  return googleServicesDestination;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const destination = prepareAndroidRelease();
  console.log(`Prepared Android Google Services input at ${destination}`);
}
