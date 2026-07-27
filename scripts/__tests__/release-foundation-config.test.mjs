import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..', '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

test('Nixpacks uses the supported Node 24 package without a separate npm derivation', () => {
  for (const path of ['backend/nixpacks.toml', 'nixpacks.toml']) {
    const config = read(path);
    assert.match(config, /nixPkgs\s*=\s*\["nodejs_24"\]/);
    assert.doesNotMatch(config, /npm-11_x/);
    assert.match(config, /npm ci/);
  }
});

test('iOS configuration entitlement assignments match their APNs environments', () => {
  const project = read('mobile/ios/Runner.xcodeproj/project.pbxproj');
  const profile = project.slice(project.indexOf('249021D4217E4FDB00AE95B9 /* Profile */'), project.indexOf('249021D5217E4FDB00AE95B9 /* Debug */'));
  const debug = project.slice(project.indexOf('97C147061CF9000F007C117D /* Debug */'), project.indexOf('97C147071CF9000F007C117D /* Release */'));
  const release = project.slice(project.indexOf('97C147071CF9000F007C117D /* Release */'));
  assert.match(profile, /Runner\/Runner-Profile\.entitlements/);
  assert.match(debug, /Runner\/Runner-Debug\.entitlements/);
  assert.match(release, /Runner\/Runner-Release\.entitlements/);
  assert.match(read('mobile/ios/Runner/Runner-Debug.entitlements'), /<string>development<\/string>/);
  assert.match(read('mobile/ios/Runner/Runner-Profile.entitlements'), /<string>production<\/string>/);
  assert.match(read('mobile/ios/Runner/Runner-Release.entitlements'), /<string>production<\/string>/);
});

test('Fastlane and CI require Gradle certificate and fail-closed release wiring', () => {
  const fastfile = read('mobile/android/fastlane/Fastfile');
  const gradle = read('mobile/android/app/build.gradle.kts');
  const ci = read('.github/workflows/ci.yml');
  assert.match(fastfile, /verifyReleaseCertificate/);
  assert.equal([...fastfile.matchAll(/from_mobile_root\(gradle_verify_command\)/g)].length, 2);
  assert.match(gradle, /tasks\.register\("verifyReleaseCertificate"\)/);
  assert.match(gradle, /dependsOn\("bundleRelease"\)/);
  assert.match(gradle, /signingConfig = signingConfigs\.getByName\("release"\)/);
  assert.match(ci, /Build migration artifacts[\s\S]*npm run build/);
  assert.match(ci, /\.\/gradlew :app:bundleRelease --dry-run/);
  assert.match(ci, /\.\/gradlew verifyReleaseCertificate --dry-run/);
  assert.match(ci, /Verify direct Gradle release fails closed without inputs/);
});
