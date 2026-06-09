# Security Dependency Alerts Remediation - 2026-06-09

## Alerts

- `ruby-jwt: Empty-key HMAC bypass; cross-language sibling of CVE-2026-44351`
  - Affected files: `mobile/android/Gemfile.lock`, `mobile/ios/Gemfile.lock`
  - Fixed by: `jwt 2.10.2` to `jwt 2.10.3`
- `uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided`
  - Affected file: `backend/package-lock.json`
  - Fixed by: `firebase-admin 13.10.0` to `14.0.0`, plus backend-local `overrides.uuid = ^11.1.1`
- `Astro: XSS in define:vars via incomplete </script> tag sanitization`
  - Affected file: `web/package-lock.json`
  - Fixed by: `astro 5.18.2` to `6.4.4`
- `Astro: Server island encrypted parameters vulnerable to cross-component replay`
  - Affected file: `web/package-lock.json`
  - Fixed by: `astro 5.18.2` to `6.4.4`

## Implementation Notes

- Node/npm verification used `fnm` with `Node v24.16.0` and `npm 11.13.0` to match the repository's Node 24 engine.
- `firebase-admin@14.0.0` still declares optional `@google-cloud/storage@^7.19.0`, which still resolves vulnerable `uuid` ranges. Since SoundCheck only uses Firebase Admin Messaging and no newer Firebase Admin patch exists, the remediation uses a backend-local npm override for `uuid@^11.1.1`.
- Astro 6 made `@astrojs/tailwind@6.0.2` invalid because that integration only peers with Astro 3, 4, and 5. The web app now uses Tailwind's Vite plugin with Tailwind 4 compatibility directives for the existing theme config.
- Astro 6 removed legacy content collections. The legal markdown collection moved from `web/src/content/config.ts` to `web/src/content.config.ts`, uses the `glob()` loader, imports `z` from `astro/zod`, and legal pages use `render(entry)`.

## Verification

All commands below were run from `C:\Users\dasbl\AndroidStudioProjects\SoundCheck` unless a subdirectory is named.

- `npm ls uuid --prefix backend` - passed; all resolved `uuid` copies under Firebase Admin storage are `11.1.1`.
- `npm audit --prefix backend --audit-level=moderate` - passed; 0 vulnerabilities.
- `npm run lint --prefix backend` - passed with 307 existing warnings and 0 errors.
- `npm run typecheck --prefix backend` - passed.
- `npm test --prefix backend -- --runTestsByPath src/__tests__/services/PushNotificationService.test.ts` - passed; 1 suite, 2 tests.
- `npm test --prefix backend` - passed; 50 suites passed, 1 skipped, 608 tests passed, 19 skipped.
- `npm run build --prefix backend` - passed.
- `npm ci --prefix web` - passed; 0 vulnerabilities.
- `npm audit --prefix web --audit-level=low` - passed; 0 vulnerabilities.
- `npm run build --prefix web` - passed; 8 static pages built.
- `bundle _2.6.9_ exec ruby -rjwt -e "puts JWT::VERSION::STRING"` from `mobile/android` - passed; printed `2.10.3`.
- `bundle _2.6.9_ exec fastlane --version` from `mobile/android` - passed; printed `fastlane 2.234.0` with non-fatal UTF-8 locale and newer-version warnings.
- `bundle _2.6.9_ exec ruby -rjwt -e "puts JWT::VERSION::STRING"` from `mobile/ios` - passed; printed `2.10.3`.
- `bundle _2.6.9_ exec fastlane --version` from `mobile/ios` - passed; printed `fastlane 2.234.0` with non-fatal UTF-8 locale and newer-version warnings.

## Final Checks

- `npm run harness:check` - passed; agent harness checks passed.
- `git diff --check` - passed; emitted only Git line-ending conversion warnings for edited text files.
