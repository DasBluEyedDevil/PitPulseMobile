# Phase 12: Monetization & Wrapped — Context & Decisions

> Generated from discuss-phase session on 2026-02-28
> Phase boundary: MONEY-01 through MONEY-05 (FIXED — no scope expansion)

## Phase Goal (from ROADMAP.md)

Users experience their year in concerts through SoundCheck Wrapped, and a premium subscription tier generates recurring revenue.

## Success Criteria

1. User can view their SoundCheck Wrapped annual recap showing top artists, venues, genres, and concert stats
2. User can share branded Wrapped recap cards to social platforms
3. User can subscribe to SoundCheck Pro ($4.99/mo) via in-app purchase on iOS and Android
4. Premium subscribers access enhanced Wrapped with detailed analytics (top sets, genre evolution, friend overlap)
5. Premium entitlements are validated server-side — revoking a subscription immediately removes access to premium features

---

## Decisions by Area

### 1. Wrapped Reveal Experience

| Decision | Choice |
|----------|--------|
| **Format** | Story-style slides — full-screen swipeable, ~6-8 slides per Wrapped |
| **Stat order** | Surprise escalation — start small/specific, build to grand total as finale |
| **Auto-advance** | Yes, with pause — 5-second timer per slide, progress bar at top, tap to pause, swipe to skip |
| **Visual style** | VoltLime brand — dark background (#0D0D0D) + voltLime (#D2FF00) accents, consistent with app identity |

**Slide sequence:**
1. "68% of your shows were [Genre]" — top genre percentage
2. "You hit [N] different venues" — unique venues count
3. "You saw [N] different bands" — unique bands count
4. "Your home venue: [Venue Name]" — top venue by visit count
5. "#1 artist: [Band Name]" — top artist by times seen
6. "[N] shows total. Legend." — grand total as finale + Share CTA

**Implementation notes:**
- Reuse onboarding `PageView.builder` + dot indicator pattern from `onboarding_screen.dart`
- Reuse elastic scale animation from `celebration_screen.dart` for stat number reveals
- Add `LinearProgressIndicator` at top for auto-advance timer (similar to Instagram Stories)
- Each slide is a `ConsumerWidget` receiving its stat data

### 2. Free vs. Premium Split

| Decision | Choice |
|----------|--------|
| **Paywall placement** | Full story free, detail page locked — all 6 story slides visible to everyone; premium unlocks deeper analytics detail page |
| **Pro perks (year-round)** | Stats & analytics focus — detailed concert analytics available year-round, Wrapped premium is the annual highlight |
| **Upsell tone** | Contextual prompt — bottom sheet when tapping locked features, shows value + one-tap subscribe. No modal interruptions |
| **Share cards** | Free: 1 summary card; Pro: per-stat cards — everyone gets one summary Wrapped card; premium can generate individual stat cards (top artist, top venue, genre) |

**Free tier includes:**
- All 6 Wrapped story slides with headline stats
- 1 summary Wrapped share card (OG + Stories format)
- Current year's Wrapped only

**Pro tier ($4.99/mo) includes everything free, plus:**
- Wrapped detail page with deeper analytics:
  - Monthly activity breakdown chart
  - Genre evolution timeline
  - Friend overlap stats
  - Top rated sets
- Per-stat share cards (top artist card, top venue card, genre card)
- Wrapped archive (browse previous years)
- Year-round detailed concert analytics (the same data, always accessible)

**Paywall UX:**
- After final story slide, "View Details" button appears
- Free users tapping it see a bottom sheet: "Unlock your detailed analytics with SoundCheck Pro" + perks list + Subscribe CTA
- No blocking modals, no aggressive popups. Contextual and respectful

### 3. Wrapped Timing & Availability

| Decision | Choice |
|----------|--------|
| **Availability** | Always available — accessible from profile year-round with running stats; December gets special "year complete" presentation |
| **Minimum threshold** | 3+ check-ins — users with fewer than 3 shows see encouraging "keep going" message instead of Wrapped |
| **History access** | Pro: archive, Free: current year only — previous years' Wrapped accessible as a Pro perk |
| **Date range** | Calendar year (Jan-Dec) — simple, universal: "Your 2026 in concerts" |

**Behavior by month:**
- Jan-Nov: Wrapped shows running year stats, updates with each new check-in
- December: Special "Year Complete" presentation unlocks with full share card generation
- Jan 1: Previous year's Wrapped becomes archive-only (Pro) or disappears (Free), current year starts fresh

**Below-threshold UX:**
- Users with 0-2 check-ins see: "You've been to [N] show(s) this year. Hit 3 shows to unlock your Wrapped!"
- Encourages engagement without generating trivial stats

### 4. Subscription Lifecycle

| Decision | Choice |
|----------|--------|
| **Cancellation** | Access until paid period ends — RevenueCat handles automatically; user reverts to free tier when period expires |
| **Entry points** | Multiple touchpoints — Pro badge on profile, settings row, dedicated Pro feature screen, subtle Pro indicators on locked features |
| **Retroactive unlock** | Instant — subscribing from Wrapped paywall immediately reveals premium detail page without re-entering |
| **Tiers** | Single tier + annual — $4.99/mo or $39.99/yr (save ~33%, 2 months free) |

**Subscription surfaces:**
1. Profile screen: Pro badge next to username (if subscribed)
2. Settings screen: "SoundCheck Pro" row → dedicated Pro feature screen
3. Dedicated Pro screen: All perks with visuals + Subscribe/Manage CTA
4. Locked features: Subtle lock icon + "Pro" label on locked analytics, Wrapped archive, per-stat share buttons
5. Wrapped paywall: Bottom sheet after story with value prop + subscribe CTA

**RevenueCat integration:**
- `purchases_flutter` SDK for mobile
- Server-side webhook at `POST /api/subscription/webhook` for receipt validation
- `is_premium` boolean on users table (set by webhook, read by middleware)
- `requirePremium()` middleware mirroring existing `requireAdmin()` pattern

**Instant unlock flow:**
1. User taps locked feature → bottom sheet appears
2. User taps Subscribe → RevenueCat paywall/checkout
3. On success, RevenueCat webhook fires → sets `is_premium = true`
4. Client receives purchase confirmation → refreshes entitlement state
5. Premium content renders immediately (no navigation required)

---

## Code Context (Codebase Scout Findings)

### Reusable Assets

| Asset | Location | Reuse Strategy |
|-------|----------|---------------|
| Satori card pipeline | `backend/src/services/ShareCardService.ts` | Add `generateWrappedCard(userId, year)` method; new R2 key namespace `cards/wrapped/{userId}-{year}-{type}.png` |
| Card templates | `backend/src/templates/share-cards/checkin-card.ts` | Create `wrapped-summary-card.ts` and per-stat card templates using same `el()` helper; UPDATE to voltLime palette |
| Landing page HTML | `backend/src/templates/share-cards/landing-page.html` | Add Wrapped landing route at `GET /share/w/:userId` |
| ShareCardPreview widget | `mobile/lib/src/features/sharing/presentation/share_card_preview.dart` | Drop directly into Wrapped share screen — handles shimmer, error, and 3 share buttons |
| Social sharing | `mobile/lib/src/features/sharing/services/social_share_service.dart` | Call existing static methods for Instagram Stories, TikTok, generic share |
| ShareRepository | `mobile/lib/src/features/sharing/data/share_repository.dart` | Add `generateWrappedCard(userId, year)` |
| StatsService | `backend/src/services/StatsService.ts` | Add `getWrappedStats(userId, year)` with date-range filter; already computes total shows, unique bands/venues, genres, top bands, top venues |
| ConcertCred models | `mobile/lib/src/features/profile/domain/concert_cred.dart` | Reuse `GenreStat`, `TopRatedBand`, `TopRatedVenue`; extend for Wrapped-specific fields |
| Onboarding carousel | `mobile/lib/src/features/onboarding/presentation/onboarding_screen.dart` | Reuse `PageView.builder` + dot indicator pattern for story slides |
| Celebration animation | `mobile/lib/src/features/sharing/presentation/celebration_screen.dart` | Reuse `elasticOut` scale + `easeIn` fade for stat reveals |
| Auth middleware | `backend/src/middleware/auth.ts` | Create `requirePremium()` following `requireAdmin()` pattern |
| Analytics hooks | `mobile/lib/src/core/services/analytics_service.dart` | `setUserProperty('plan', 'premium')` already stubbed |

### Greenfield Work

| Component | Details |
|-----------|---------|
| RevenueCat SDK | Add `purchases_flutter` to mobile `pubspec.yaml`; create `SubscriptionService` |
| `is_premium` column | Migration 038: `ALTER TABLE users ADD COLUMN is_premium BOOLEAN DEFAULT FALSE` |
| Webhook handler | `POST /api/subscription/webhook` — validates RevenueCat signatures, sets `is_premium` |
| `requirePremium()` | New middleware in `auth.ts` checking `user.isPremium` |
| Wrapped story screen | New feature: `mobile/lib/src/features/wrapped/` with story slides + detail page |
| Pro feature screen | New screen showing all Pro perks with subscribe/manage CTA |
| Year-range StatsService | Extend existing queries with `AND EXTRACT(YEAR FROM c.created_at) = $year` |
| Wrapped share cards | New satori templates for summary card + per-stat cards (top artist, top venue, genre) |

### Migration Numbering

Current highest migration: `037_denormalized-count-triggers.ts`
Next available: `038_*`

### Route Pattern

Wrapped routes should follow the dual-router pattern:
- Authenticated: `app.use('/api/wrapped', wrappedRoutes.api)`
- Public: `app.use('/wrapped', wrappedRoutes.public)` (landing pages)
- Subscription: `app.use('/api/subscription', subscriptionRoutes)`

---

## Deferred Ideas (Out of Phase 12 Scope)

_None captured during discussion._

---

## Next Steps

1. **Research** (`/gsd:research-phase 12`) — Investigate RevenueCat Flutter SDK integration, webhook validation patterns, and year-range SQL optimization
2. **Plan** (`/gsd:plan-phase 12`) — Break into executable plans based on these decisions
