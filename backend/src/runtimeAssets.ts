import fs from 'fs';
import path from 'path';

export type RuntimeAssetPaths = {
  font: string;
  landingTemplate: string;
  license: string;
  provenance: string;
};

export function runtimeAssetPaths(runtimeRoot: string = __dirname): RuntimeAssetPaths {
  return {
    font: path.join(runtimeRoot, 'fonts', 'Inter-Bold.ttf'),
    landingTemplate: path.join(runtimeRoot, 'templates', 'share-cards', 'landing-page.html'),
    license: path.join(runtimeRoot, 'fonts', 'LICENSE.txt'),
    provenance: path.join(runtimeRoot, 'fonts', 'PROVENANCE.md'),
  };
}

export function assertSupportedFontSignature(font: Buffer): void {
  if (font.length < 4) {
    throw new Error('Unsupported font signature: file is too short');
  }

  const signature = font.subarray(0, 4);
  const isTrueType =
    signature[0] === 0x00 &&
    signature[1] === 0x01 &&
    signature[2] === 0x00 &&
    signature[3] === 0x00;
  const signatureText = signature.toString('ascii');
  const isSupportedContainer = ['OTTO', 'true', 'ttcf'].includes(signatureText);

  if (!isTrueType && !isSupportedContainer) {
    throw new Error(`Unsupported font signature: ${signature.toString('hex')}`);
  }
}

export function validateRuntimeAssets(paths: RuntimeAssetPaths = runtimeAssetPaths()): void {
  for (const [asset, assetPath] of Object.entries(paths)) {
    if (!fs.existsSync(assetPath)) {
      throw new Error(`Missing runtime ${asset}: ${assetPath}`);
    }
  }

  assertSupportedFontSignature(fs.readFileSync(paths.font));
}
