import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import {
  readJson,
  validateAasa,
  validateAssetlinks,
} from "./association-contracts.mjs";
import {
  PUBLIC_API_ORIGIN_PLACEHOLDER,
  extractPublicApiBaseUrlFromHtml,
  publicApiOriginFromBaseUrl,
} from "./public-api-base-url.mjs";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(currentDir, "..");
const distDir = path.join(webRoot, "dist");
const failures = [];

const resetPasswordMarkers = [
  "Reset password",
  "/auth/reset-password",
  "URLSearchParams",
];

const requiredPages = new Map([
  [
    "reset-password",
    resetPasswordMarkers,
  ],
  ["delete-account", ["Delete your account", "support@soundcheck.app"]],
  ["support", ["Support", "support@soundcheck.app"]],
  ["privacy", ["Privacy Policy"]],
  ["terms", ["Terms of Service"]],
  ["child-safety", ["Child Safety"]],
  ["download", ["Download SoundCheck"]],
]);

function requireFile(relativePath) {
  const filePath = path.join(distDir, relativePath);
  if (!fs.existsSync(filePath)) {
    failures.push(`Missing built file ${relativePath}`);
    return null;
  }
  return filePath;
}

function checkPage(route, markers) {
  const filePath = requireFile(path.join(route, "index.html"));
  if (!filePath) {
    return;
  }
  const html = fs.readFileSync(filePath, "utf8");
  markers.forEach((marker) => {
    if (!html.includes(marker)) {
      failures.push(`/${route} is missing ${JSON.stringify(marker)}.`);
    }
  });
  for (const asset of [
    "/favicon.png",
    "/og-image.png",
    "/soundcheck-header-logo.png",
  ]) {
    if (!html.includes(asset)) {
      failures.push(
        `/${route} is missing the public asset reference ${asset}.`,
      );
    }
  }
}

async function checkImage(relativePath, options = {}) {
  const filePath = requireFile(relativePath);
  if (!filePath) {
    return;
  }
  const metadata = await sharp(filePath).metadata();
  if (metadata.format !== "png") {
    failures.push(
      `${relativePath} must contain PNG data; found ${metadata.format}.`,
    );
  }
  if (options.square && metadata.width !== metadata.height) {
    failures.push(`${relativePath} must be square.`);
  }
  if (options.width && metadata.width !== options.width) {
    failures.push(
      `${relativePath} must be ${options.width}px wide; found ${metadata.width}px.`,
    );
  }
  if (options.height && metadata.height !== options.height) {
    failures.push(
      `${relativePath} must be ${options.height}px tall; found ${metadata.height}px.`,
    );
  }
  if (options.opaque && metadata.hasAlpha) {
    failures.push(`${relativePath} must be opaque.`);
  }
  if (!metadata.width || !metadata.height) {
    failures.push(`${relativePath} has invalid dimensions.`);
  }
}

async function main() {
  if (!fs.existsSync(distDir)) {
    throw new Error(
      "web/dist is absent; run astro build before validating the public surface.",
    );
  }

  requiredPages.forEach((markers, route) => checkPage(route, markers));

  let apiBaseUrl;
  const resetPasswordPath = path.join(
    distDir,
    "reset-password",
    "index.html",
  );
  if (fs.existsSync(resetPasswordPath)) {
    try {
      apiBaseUrl = extractPublicApiBaseUrlFromHtml(
        fs.readFileSync(resetPasswordPath, "utf8"),
      );
    } catch (error) {
      failures.push(error.message);
    }
  }

  await checkImage("favicon.png", {
    square: true,
    width: 512,
    height: 512,
    opaque: true,
  });
  await checkImage("og-image.png", { width: 1200, height: 630, opaque: true });
  await checkImage("soundcheck-header-logo.png", { width: 1500, height: 403 });

  const aasaPath = requireFile(".well-known/apple-app-site-association");
  if (aasaPath) {
    try {
      validateAasa(readJson(aasaPath, "built apple-app-site-association"));
    } catch (error) {
      failures.push(error.message);
    }
  }

  const assetlinksPath = path.join(distDir, ".well-known/assetlinks.json");
  if (fs.existsSync(assetlinksPath)) {
    try {
      const expectedFingerprint =
        process.env.SOUNDCHECK_ANDROID_VERIFIED_APP_SIGNING_SHA256;
      if (!expectedFingerprint) {
        throw new Error(
          "SOUNDCHECK_ANDROID_VERIFIED_APP_SIGNING_SHA256 is required whenever the build contains assetlinks.json.",
        );
      }
      validateAssetlinks(
        readJson(assetlinksPath, "built assetlinks.json"),
        expectedFingerprint,
      );
    } catch (error) {
      failures.push(error.message);
    }
  } else {
    console.warn(
      "Android association pending: no assetlinks.json is published until the app-signing fingerprint is verified.",
    );
  }

  const headersPath = requireFile("_headers");
  if (headersPath) {
    const headers = fs.readFileSync(headersPath, "utf8");
    if (headers.includes(PUBLIC_API_ORIGIN_PLACEHOLDER)) {
      failures.push(
        "_headers still contains the PUBLIC_API_BASE_URL connect-src placeholder.",
      );
    }
    if (apiBaseUrl) {
      try {
        const origin = publicApiOriginFromBaseUrl(apiBaseUrl);
        const connectSrc = headers.match(/connect-src\s+([^;]+)/i);
        const sources = connectSrc
          ? connectSrc[1].trim().split(/\s+/)
          : [];
        if (!sources.includes(origin)) {
          failures.push(
            `_headers connect-src does not allow PUBLIC_API_BASE_URL origin ${JSON.stringify(origin)}.`,
          );
        }
      } catch (error) {
        failures.push(error.message);
      }
    }
    for (const associationPath of [
      "/.well-known/apple-app-site-association",
      "/.well-known/assetlinks.json",
    ]) {
      const escapedPath = associationPath.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      );
      const associationBlock = headers.match(
        new RegExp(
          `^${escapedPath}\\r?\\n((?:[ \\t]+[^\\r\\n]+\\r?\\n?)*)`,
          "m",
        ),
      );
      if (
        !associationBlock ||
        !/^[ \t]+Content-Type:\s*application\/json(?:;\s*charset=utf-8)?\s*$/m.test(
          associationBlock[1],
        )
      ) {
        failures.push(`_headers does not declare JSON for ${associationPath}.`);
      }
    }
  }

  const redirectsPath = requireFile("_redirects");
  if (redirectsPath) {
    const redirects = fs.readFileSync(redirectsPath, "utf8");
    for (const redirect of [
      "/privacy.html /privacy 301",
      "/terms.html /terms 301",
      "/support.html /support 301",
      "/delete-account.html /delete-account 301",
    ]) {
      if (!redirects.includes(redirect)) {
        failures.push(`Missing redirect contract: ${redirect}`);
      }
    }
  }

  if (failures.length > 0) {
    console.error("Public web build validation failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log(
    "Public web build validation passed: lifecycle/legal pages, associations, redirects, and release-sized PNG assets.",
  );
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
