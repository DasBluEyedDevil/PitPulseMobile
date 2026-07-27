import fs from 'fs';
import { describe, expect, it } from '@jest/globals';

import {
  assertSupportedFontSignature,
  runtimeAssetPaths,
  validateRuntimeAssets,
} from '../runtimeAssets';

describe('runtime assets', () => {
  it('rejects HTML masquerading as a font', () => {
    expect(() => assertSupportedFontSignature(Buffer.from('<!DOCTYPE html>'))).toThrow(
      'Unsupported font signature'
    );
  });

  it('resolves and validates the licensed source assets', () => {
    const paths = runtimeAssetPaths();

    expect(paths.font).toBe(require.resolve('../fonts/Inter-Bold.ttf'));
    expect(() => validateRuntimeAssets(paths)).not.toThrow();
    expect(fs.readFileSync(paths.provenance, 'utf8')).toContain(
      'https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip'
    );
  });
});
