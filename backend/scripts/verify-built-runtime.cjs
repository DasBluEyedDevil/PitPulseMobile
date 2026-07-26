/* global process */

const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'phase-30-built-runtime-smoke-secret';

const express = require('express');
const request = require('supertest');

const { ShareCardService } = require('../dist/services/ShareCardService.js');
const { ShareController } = require('../dist/controllers/ShareController.js');
const { WrappedController } = require('../dist/controllers/WrappedController.js');

async function verifyWrappedLanding() {
  const controller = new WrappedController({
    wrappedService: {},
    shareCardService: {},
  });
  const app = express();
  app.get('/wrapped/:userId/:year', controller.renderWrappedLanding);

  const response = await request(app).get('/wrapped/11111111-1111-4111-8111-111111111111/2026');

  assert.equal(response.status, 200);
  assert.match(response.text, /SoundCheck Wrapped 2026/);
  assert.doesNotMatch(response.text, /\{\{TITLE\}\}/);
}

async function verifyCheckinLandingFallback() {
  const controller = new ShareController({
    checkinService: {
      getCheckinById: async () => ({
        id: 'checkin-1',
        eventDate: '2026-07-26',
        rating: 4.5,
        user: { username: 'alice' },
        band: { name: 'Built Band' },
        venue: { name: 'Built Venue', city: 'Boston' },
      }),
    },
    badgeService: {},
    shareCardService: {
      generateCheckinCard: async () => {
        throw new Error('simulated provider outage');
      },
    },
  });
  const app = express();
  app.get('/share/c/:checkinId', controller.renderCheckinLanding);

  const response = await request(app).get('/share/c/checkin-1');

  assert.equal(response.status, 200);
  assert.match(response.text, /Built Band at Built Venue/);
  assert.doesNotMatch(response.text, /\{\{IMAGE_URL\}\}/);
}

async function verifyUncachedSatoriRender() {
  const uploads = [];
  const storage = {
    isReady: true,
    configured: true,
    headObject: async () => ({ exists: false }),
    getPublicUrl: (key) => `https://cdn.example.com/${key}`,
    uploadBuffer: async (buffer, key, contentType) => {
      uploads.push({ buffer, key, contentType });
      return `https://cdn.example.com/${key}`;
    },
  };
  const service = new ShareCardService(storage);

  const urls = await service.generateCheckinCard('uncached-checkin', {
    username: 'alice',
    bandName: 'Satori Band',
    venueName: 'Satori Venue',
    venueCity: 'Boston',
    eventDate: 'Jul 26, 2026',
    rating: 5,
  });

  assert.equal(uploads.length, 2);
  assert.ok(uploads.every(({ buffer }) => buffer.subarray(1, 4).toString('ascii') === 'PNG'));
  assert.ok(uploads.every(({ contentType }) => contentType === 'image/png'));
  assert.match(urls.ogUrl, /uncached-checkin-og\.png$/);
  assert.match(urls.storiesUrl, /uncached-checkin-stories\.png$/);
}

async function main() {
  await verifyWrappedLanding();
  await verifyCheckinLandingFallback();
  await verifyUncachedSatoriRender();
  process.stdout.write('Built runtime smoke: 3/3 checks passed\n');
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
