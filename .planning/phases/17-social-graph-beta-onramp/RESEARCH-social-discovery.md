# Phase 17 Research: Social Graph & Beta Onramp

## Requirements

- **BETA-25**: Users can discover and follow other users via search or suggestions
- **BETA-26**: Post-check-in celebration screen prominently features share action as primary CTA
- **BETA-27**: Global feed shows activity from seeded demo accounts on beta launch day
- **BETA-28**: RevenueCat SDK uses non-deprecated purchase API

## Findings

### BETA-25: User Discovery & Follow

**What exists:**
- Follow system fully implemented (FollowService, FollowController, mobile integration)
- User search endpoint exists: `GET /api/search/users?q=query` (UserService.searchUsers)
- User profiles include: location, bio, stats (totalCheckins, uniqueBands, uniqueVenues), follower counts
- Block filtering, analytics, WebSocket `new_follower` notifications all working

**What's missing:**
- Users NOT in unified search (`/api/search` supports band/venue/event only)
- No user discovery/suggestion endpoint (no recommendation algorithm)
- Mobile search screen has no "Users" filter (SearchFilter enum: all, venues, bands, events)
- No mobile "Discover Users" screen or suggestions UI

**Key files:**
- `backend/src/services/FollowService.ts` — complete follow logic
- `backend/src/services/SearchService.ts` — unified search (needs user type)
- `backend/src/services/UserService.ts` — has searchUsers() method (lines 246-293)
- `backend/src/controllers/UserController.ts` — has searchUsers endpoint (lines 416-455)
- `mobile/lib/src/features/search/presentation/search_screen.dart`
- `mobile/lib/src/features/search/data/search_providers.dart`

### BETA-26: Share CTA Elevation

**What exists:**
- CelebrationScreen at `mobile/lib/src/features/sharing/presentation/celebration_screen.dart`
- Full share pipeline: ShareCardService (satori → resvg → R2), SocialShareService (Instagram Stories, TikTok, generic OS share)
- ShareCardPreview widget shows card image + 3 share buttons (52x52 circles)
- Async card generation with loading shimmer

**Current visual hierarchy problem:**
1. Success animation (80x80) — HIGH prominence
2. "You checked in!" heading — HIGH
3. Badge section — MEDIUM
4. "Share your check-in" label (14px secondary) — LOW
5. Share buttons (52x52 circles) — MEDIUM
6. **Done button (full-width VoltLime 56px) — HIGHEST** ← This is the primary CTA (wrong!)

**What needs to change:**
- Move share section UP (before badges)
- Make share action the primary CTA (full-width VoltLime button)
- Demote "Done" to secondary/ghost style
- Only file: `celebration_screen.dart` (possibly `share_card_preview.dart`)

### BETA-27: Global Feed & Seed Content

**What exists:**
- 3 feed types: Friends, Event, Happening Now (FeedService.ts, 416 lines)
- Cursor-based pagination, Redis caching (60s/30s TTL), block filtering, is_hidden filtering
- Demo seed script: `backend/src/scripts/seed-demo.ts` (260 lines) — creates 1 demo account with 8 check-ins, 3 follows, badges
- `users.is_demo BOOLEAN DEFAULT false` flag exists
- Mobile FeedScreen: 3-tab TabBar with infinite scroll, pull-to-refresh, empty states

**What's missing:**
- No global/discover feed endpoint
- No mobile global feed tab
- Only 1 demo account seeded (need multiple for social feel)

**Key files:**
- `backend/src/services/FeedService.ts` — extend with getGlobalFeed()
- `backend/src/controllers/FeedController.ts` — add route
- `backend/src/scripts/seed-demo.ts` — enhance for multiple accounts
- `mobile/lib/src/features/feed/presentation/feed_screen.dart` — add tab
- `mobile/lib/src/features/feed/data/feed_repository.dart`

### BETA-28: RevenueCat API Update

**What exists:**
- `purchases_flutter: ^9.12.3` (latest, current)
- SubscriptionService in `mobile/lib/src/features/subscription/data/subscription_service.dart`
- Backend SubscriptionService handles webhooks correctly (idempotent, all event types)
- Uses: configure(), purchasePackage(), restorePurchases(), getOfferings(), getCustomerInfo(), logIn(), logOut()

**Problem — v9.0+ API not used correctly:**
- `purchasePackage()` returns `Future<PurchaseResult>` since v9.0 but result is NOT captured
- Error handling catches generic `e` instead of `PlatformException` with `PurchasesErrorHelper.getErrorCode()`
- Both purchase() and restorePurchases() return `bool` instead of detailed results
- No distinction between user cancellation vs. actual errors in UI

**Files to update:**
- `mobile/lib/src/features/subscription/data/subscription_service.dart` — API modernization
- `mobile/lib/src/features/subscription/presentation/premium_paywall_sheet.dart` — error handling
- `mobile/lib/src/features/subscription/presentation/pro_feature_screen.dart` — error handling

## Plan Structure

**Plan 1 (Backend):** UserDiscoveryService + users in unified search + global feed endpoint + enhanced demo seeding + migration
**Plan 2 (Mobile):** User discovery UI + search users filter + global feed tab + share CTA elevation + RevenueCat API update
