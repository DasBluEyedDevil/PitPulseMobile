import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, '../..');
const flashDir = resolve(repoRoot, 'mobile/assets/brand/flash');
const brandDir = resolve(currentDir, '../public/brand');

mkdirSync(brandDir, { recursive: true });

const mappings = [
  ['flash_logo_wordmark_adobe_express.png', 'wordmark.png'],
  ['flash_mark_cutout.png', 'mark.png'],
  ['flash_auth_hero.jpg', 'hero-auth.jpg'],
  ['flash_onboarding_hero.jpg', 'hero-onboarding.jpg'],
  ['flash_stage_mark_portrait.jpg', 'hero-stage.jpg'],
  ['flash_show_card_1.jpg', 'show-card-1.jpg'],
  ['flash_show_card_2.jpg', 'show-card-2.jpg'],
  ['flash_show_card_3.jpg', 'show-card-3.jpg'],
  ['flash_feed_backdrop.jpg', 'feed-backdrop.jpg'],
  ['flash_discover_backdrop.jpg', 'discover-backdrop.jpg'],
  ['flash_profile_wave.jpg', 'profile-wave.jpg'],
  ['flash_profile_header.jpg', 'profile-header.jpg'],
  ['flash_wave_panorama.jpg', 'wave-panorama.jpg'],
  ['flash_empty_stage.jpg', 'empty-stage.jpg'],
];

for (const [src, dest] of mappings) {
  copyFileSync(resolve(flashDir, src), resolve(brandDir, dest));
}

copyFileSync(resolve(brandDir, 'mark.png'), resolve(currentDir, '../public/favicon.png'));
copyFileSync(resolve(brandDir, 'wordmark.png'), resolve(currentDir, '../public/og-image.png'));
copyFileSync(
  resolve(brandDir, 'wordmark.png'),
  resolve(currentDir, '../public/soundcheck-header-logo.png'),
);

console.log('Synced brand assets to public/brand/');
