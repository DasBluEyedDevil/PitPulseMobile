/* global __dirname, clearInterval, clearTimeout, process, setInterval, setTimeout */

const assert = require('node:assert/strict');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');

async function reservePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  const port = address.port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

function canConnect(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.setTimeout(100);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    const unavailable = () => {
      socket.destroy();
      resolve(false);
    };
    socket.once('error', unavailable);
    socket.once('timeout', unavailable);
  });
}

async function main() {
  const port = await reservePort();
  const child = spawn(process.execPath, [path.resolve(__dirname, '../dist/index.js')], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
      DATABASE_URL: 'postgresql://soundcheck:soundcheck@127.0.0.1:1/soundcheck_phase30',
      DB_SSL: 'false',
      DB_POOL_MIN: '0',
      DB_CONNECTION_TIMEOUT_MS: '1000',
      JWT_SECRET: 'phase-30-unhealthy-startup-secret',
      ENABLE_WEBSOCKET: 'true',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let output = '';
  let listenerObserved = false;
  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });

  const probe = setInterval(async () => {
    if (await canConnect(port)) {
      listenerObserved = true;
    }
  }, 50);

  let exitTimeout;
  const exitCode = await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    new Promise((_, reject) => {
      exitTimeout = setTimeout(() => {
        child.kill();
        reject(new Error('Unhealthy startup did not exit within 15 seconds'));
      }, 15_000);
    }),
  ]);
  clearTimeout(exitTimeout);
  clearInterval(probe);

  assert.equal(exitCode, 1);
  assert.equal(listenerObserved, false);
  assert.doesNotMatch(output, /SoundCheck API Server running/);
  assert.doesNotMatch(output, /WebSocket server initialized/);
  assert.doesNotMatch(output, /worker started/);
  assert.doesNotMatch(output, /Scheduled event sync jobs registered/);
  assert.match(output, /Database connection failed/);

  process.stdout.write(
    'Unhealthy startup smoke: exit=1, listener=false, websocket=false, workers=false, scheduler=false\n'
  );
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
