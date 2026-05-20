import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [platform, ...fastlaneArgs] = process.argv.slice(2);

if (!['android', 'ios'].includes(platform) || fastlaneArgs.length === 0) {
  console.error('Usage: node scripts/run-fastlane.mjs <android|ios> <lane-or-fastlane-args...>');
  process.exit(2);
}

const platformDir = path.join(repoRoot, 'mobile', platform);
const rubyExe = resolveRuby();
const rubyDir = path.dirname(rubyExe);
const env = { ...process.env };

delete env.GEM_HOME;
delete env.GEM_PATH;
delete env.RUBYLIB;
delete env.RUBYOPT;

const pathKey = Object.keys(env).find((key) => key.toLowerCase() === 'path') ?? 'PATH';
env[pathKey] = `${rubyDir}${path.delimiter}${env[pathKey] ?? ''}`;
if (pathKey !== 'PATH') {
  delete env.PATH;
}
env.LANG = env.LANG || 'en_US.UTF-8';
env.LC_ALL = env.LC_ALL || 'en_US.UTF-8';

const result = spawnSync(
  rubyExe,
  ['-S', 'bundle', 'exec', 'ruby', '-S', 'fastlane', ...fastlaneArgs],
  {
    cwd: platformDir,
    env,
    stdio: 'inherit',
    shell: false,
  },
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);

function resolveRuby() {
  const explicitRuby = process.env.SOUNDCHECK_RUBY_EXE;
  if (explicitRuby && fs.existsSync(explicitRuby)) {
    return explicitRuby;
  }

  const explicitRubyBin = process.env.SOUNDCHECK_RUBY_BIN;
  if (explicitRubyBin) {
    const candidate = path.join(explicitRubyBin, process.platform === 'win32' ? 'ruby.exe' : 'ruby');
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  const candidates =
    process.platform === 'win32'
      ? [
          'C:/tools/ruby34/bin/ruby.exe',
          'C:/Ruby34-x64/bin/ruby.exe',
          'C:/Ruby33-x64/bin/ruby.exe',
          path.join(process.env.USERPROFILE ?? '', 'scoop/apps/ruby/current/bin/ruby.exe'),
        ]
      : ['/usr/bin/ruby', '/usr/local/bin/ruby', '/opt/homebrew/bin/ruby'];

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  const whereResult = spawnSync(process.platform === 'win32' ? 'where.exe' : 'which', ['ruby'], {
    encoding: 'utf8',
  });
  const rubyFromPath = whereResult.stdout?.split(/\r?\n/).find(Boolean);
  if (rubyFromPath && fs.existsSync(rubyFromPath)) {
    return rubyFromPath;
  }

  console.error(
    'Ruby was not found. Set SOUNDCHECK_RUBY_EXE to ruby.exe or SOUNDCHECK_RUBY_BIN to the Ruby bin directory.',
  );
  process.exit(1);
}
