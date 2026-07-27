import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { androidReleaseInputNames, prepareAndroidRelease } from '../prepare-android-release.mjs';

function createFixture() {
  const root = mkdtempSync(join(tmpdir(), 'soundcheck-android-release-'));
  const appDirectory = join(root, 'mobile/android/app');
  mkdirSync(appDirectory, { recursive: true });
  const googleServices = join(root, 'google-services.source.json');
  const keystore = join(root, 'release.keystore');
  writeFileSync(googleServices, '{"project_info":{"project_number":"fixture"}}\n');
  writeFileSync(keystore, 'fixture-keystore');
  return { root, googleServices, keystore };
}

function releaseEnvironment(fixture) {
  return {
    SOUNDCHECK_GOOGLE_SERVICES_JSON_PATH: fixture.googleServices,
    SOUNDCHECK_ANDROID_KEYSTORE_PATH: fixture.keystore,
    SOUNDCHECK_ANDROID_KEYSTORE_PASSWORD: 'fixture-store-password',
    SOUNDCHECK_ANDROID_KEY_ALIAS: 'fixture-alias',
    SOUNDCHECK_ANDROID_KEY_PASSWORD: 'fixture-key-password',
  };
}

test('fails closed when any Android release input is missing', () => {
  const fixture = createFixture();
  try {
    for (const missingName of androidReleaseInputNames) {
      const environment = releaseEnvironment(fixture);
      delete environment[missingName];
      assert.throws(() => prepareAndroidRelease({ environment, repositoryRoot: fixture.root }), new RegExp(missingName));
    }
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('copies Google Services only after all non-secret release inputs validate', () => {
  const fixture = createFixture();
  try {
    const destination = prepareAndroidRelease({
      environment: releaseEnvironment(fixture),
      repositoryRoot: fixture.root,
    });
    assert.equal(readFileSync(destination, 'utf8'), readFileSync(fixture.googleServices, 'utf8'));
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});
