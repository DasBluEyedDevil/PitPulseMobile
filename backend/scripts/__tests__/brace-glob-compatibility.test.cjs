const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createRequire } = require('node:module');
const { after, before, test } = require('node:test');

const TestExclude = require('test-exclude');

let fixtureRoot;

before(() => {
  fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'soundcheck-brace-glob-'));
  for (const filename of ['alpha.txt', 'beta.txt', 'gamma.txt', 'app.js', 'app.test.js']) {
    fs.writeFileSync(path.join(fixtureRoot, filename), filename);
  }
  fs.mkdirSync(path.join(fixtureRoot, 'production'));
  for (const filename of ['alpha.txt', 'beta.txt', 'gamma.txt']) {
    fs.writeFileSync(path.join(fixtureRoot, 'production', filename), filename);
  }
});

after(() => {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
});

function consumerDependency(packageName, dependencyName) {
  const consumerRequire = createRequire(require.resolve(packageName));
  return consumerRequire(dependencyName);
}

test('Google Vision production cleanup expands brace patterns', () => {
  const { rimrafSync } = consumerDependency('google-gax', 'rimraf');
  const pattern = path
    .join(fixtureRoot, 'production', '{alpha,beta}.txt')
    .split(path.sep)
    .join('/');

  rimrafSync(pattern, { glob: true });

  assert.equal(fs.existsSync(path.join(fixtureRoot, 'production', 'alpha.txt')), false);
  assert.equal(fs.existsSync(path.join(fixtureRoot, 'production', 'beta.txt')), false);
  assert.equal(fs.existsSync(path.join(fixtureRoot, 'production', 'gamma.txt')), true);
});

test('node-pg-migrate production glob expands brace patterns', () => {
  const { globSync } = consumerDependency('node-pg-migrate', 'glob');

  assert.deepEqual(globSync('{alpha,beta}.txt', { cwd: fixtureRoot }).sort(), [
    'alpha.txt',
    'beta.txt',
  ]);
});

test('Jest discovery glob expands brace patterns', () => {
  const { globSync } = require('glob');

  assert.deepEqual(globSync('{alpha,beta}.txt', { cwd: fixtureRoot }).sort(), [
    'alpha.txt',
    'beta.txt',
  ]);
});

test('coverage exclusion expands brace patterns', () => {
  const coverageExclusions = new TestExclude({
    cwd: fixtureRoot,
    exclude: ['**/*.{test,spec}.js'],
  });

  assert.equal(coverageExclusions.shouldInstrument(path.join(fixtureRoot, 'app.test.js')), false);
  assert.equal(coverageExclusions.shouldInstrument(path.join(fixtureRoot, 'app.js')), true);
});
