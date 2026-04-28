# Requirements: v5.0 — Feature Completion & E2E Polish

## Audit

- [ ] **AUDIT-01**: `.planning/milestones/v5.0-AUDIT.md` exists and enumerates concrete E2E gaps (as-is state, gap description, proposed fix, file refs, severity) for all 10 flows: B1-B5 (Core Check-in) and D1-D5 (Social/Sharing). Audit findings seed Phases 29+.

## Core Check-in E2E (B)

*Requirements populated from audit findings in Phase 28. Placeholder IDs below are the expected shape — actual requirements will be written into this file after AUDIT completes.*

- [ ] **B1**: Quick check-in <10s works E2E (app open → GPS → event match → rating → submit → visible in feed) on real device
- [ ] **B2**: Photo upload works E2E (camera/gallery → presigned URL → R2 PUT → display on check-in card)
- [ ] **B3**: Multi-band event check-in captures per-set band ratings correctly
- [ ] **B4**: User-created event auto-merges with Ticketmaster match within N hours
- [ ] **B5**: Location verify handles edge cases (no-GPS, large venue radius, spoof detection, venue_type-aware radius)

## Social / Sharing E2E (D)

- [ ] **D1**: Check-in celebration share works E2E to Instagram Stories / X / TikTok with app-store CTA
- [ ] **D2**: Badge unlock share works E2E from badge detail to landing page
- [ ] **D3**: Wrapped annual recap share works E2E (Pro feature, story slides, branded cards)
- [ ] **D4**: Shared link landing page loads with correct App Store + Play Store deep links
- [ ] **D5**: Satori share card templates render with real user data, no overflow, WCAG-accessible

---

**Total so far: 1 AUDIT requirement (pre-audit) + 10 placeholder E2E requirements (to be concretized)**
**Phases: 28 (AUDIT), 29+ (gap closure — defined post-audit)**

**Exploration**: `.planning/exploration-v5.0-feature-completion.md`
