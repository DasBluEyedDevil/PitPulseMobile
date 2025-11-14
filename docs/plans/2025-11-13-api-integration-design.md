# PitPulse API Integration Design
**Date:** 2025-11-13
**Status:** Approved
**Goal:** Transform PitPulse into "Untappd for Live Music" with external API integration and event-based check-ins

---

## Executive Summary

PitPulse will mirror Untappd's model but for concerts and live music. Users discover venues (via Foursquare) and bands (via MusicBrainz), check into shows they attend, rate both the venue and the band separately, and build a shared community database of concert experiences.

**Core User Flow:**
1. User attends a concert
2. Taps FAB (Floating Action Button) → Opens check-in
3. Selects venue + band + date
4. Rates venue (sound, atmosphere) and band (performance) separately
5. Posts check-in with optional photo and review
6. Friends can toast 🍻 and comment

---

## Architecture Overview

### Data Model Philosophy
**Hybrid Bootstrap Approach:**
- **External APIs** (Foursquare + MusicBrainz) provide rich data for discovery
- **User contributions** fill gaps and add community venues/bands
- **Events** connect venues + bands + dates as the core entity
- **Check-ins** capture user experiences at events with dual ratings

### Key Entities
1. **Venues** - Concert halls, clubs, arenas (Foursquare + user-created)
2. **Bands** - Artists and musicians (MusicBrainz + user-created)
3. **Events** - Specific shows (venue + band + date)
4. **Check-ins** - User attendance with venue/band ratings
5. **Users** - Community members with profiles and badges

---

## Database Schema

### New Tables

```sql
-- Events (the concert/show entity)
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
    event_date DATE NOT NULL,
    event_name VARCHAR(255),
    created_by_user_id UUID REFERENCES users(id),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(venue_id, band_id, event_date)
);

-- Check-ins (user attendance at events)
CREATE TABLE checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    venue_rating INTEGER CHECK (venue_rating >= 1 AND venue_rating <= 5),
    band_rating INTEGER CHECK (band_rating >= 1 AND band_rating <= 5),
    review_text TEXT,
    image_urls TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, event_id)
);

-- Toasts (quick kudos like Untappd)
CREATE TABLE checkin_toasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    checkin_id UUID NOT NULL REFERENCES checkins(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(checkin_id, user_id)
);

-- Comments on check-ins
CREATE TABLE checkin_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    checkin_id UUID NOT NULL REFERENCES checkins(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Schema Modifications

```sql
-- Add external ID tracking to venues
ALTER TABLE venues ADD COLUMN foursquare_place_id VARCHAR(255) UNIQUE;
ALTER TABLE venues ADD COLUMN source VARCHAR(50) DEFAULT 'user_created';
-- source values: 'foursquare', 'user_created'

-- Add external ID tracking to bands
ALTER TABLE bands ADD COLUMN musicbrainz_id VARCHAR(255) UNIQUE;
ALTER TABLE bands ADD COLUMN source VARCHAR(50) DEFAULT 'user_created';
-- source values: 'musicbrainz', 'user_created'
```

### Rating Aggregation Logic
- **Venue rating** = AVG of all `venue_rating` from checkins where event.venue_id = venue
- **Band rating** = AVG of all `band_rating` from checkins where event.band_id = band

---

## External APIs

### Foursquare Places API
**Purpose:** Venue discovery and data
**Cost:** $200/month free credits
**Rate Limit:** 50 req/sec
**API Key:** Stored in `FOURSQUARE_API_KEY` env variable

**Endpoints Used:**
- Place Search: Search for venues by name/location
- Place Details: Get full venue information

**Data Imported:**
- Name, address, city, state, country, postal code
- Latitude, longitude (for mapping)
- Photos (venue images)
- Categories (concert hall, club, arena, etc.)
- Foursquare Place ID (for deduplication)

### MusicBrainz API
**Purpose:** Band/artist discovery and metadata
**Cost:** 100% FREE
**Rate Limit:** 1 req/sec (average)
**Auth:** User-Agent header only (no API key)

**Endpoints Used:**
- Artist Search: Search for bands by name
- Artist Details: Get full artist information

**Data Imported:**
- Name, genre, formed year
- Biography/description
- Hometown/origin
- MusicBrainz ID (for deduplication)

---

## Mobile App Structure (Mirroring Untappd)

### Bottom Navigation (5 Tabs)

1. **Activity** - Social timeline
   - Friends' recent check-ins
   - Nearby concerts (within 40mi)
   - Groups (local scenes, genres)
   - Toast & comment on check-ins

2. **Venues** - Browse concert venues
   - Search and filter venues
   - Verified venues with event listings
   - See upcoming shows at each venue

3. **Discover** - Discovery hub (default on first launch)
   - Search venues & bands
   - Trending shows this week
   - Top-rated venues nearby
   - Featured bands
   - **"Search External Sources"** button

4. **Map** - Geographic discovery
   - Nearby venues with pins
   - Shows what's playing tonight
   - (No FAB on this screen)

5. **Profile** - Your music journey
   - Check-in statistics
   - Earned badges
   - Your reviews
   - Friends list

### Floating Action Button (FAB)
- Large "+" overlay button
- Available on all tabs except Map
- Primary check-in action

---

## Check-In Flow

### Starting a Check-In (3 Ways)

1. **FAB Button** - Tap from any screen
2. **From Search** - Search band → "Check-In" button
3. **Verified Venue** - Tap "Check-In Here" → Select from tonight's lineup

### Check-In Screen Fields

```
┌─────────────────────────────┐
│  Check-In to a Show         │
├─────────────────────────────┤
│  VENUE: [Search/Select]     │  ← Required, proximity check (40mi)
│  📍 The Fillmore, SF        │
│                             │
│  BAND: [Search/Select]      │  ← Required
│  🎸 The Midnight Riders     │
│                             │
│  EVENT DATE: [Date Picker]  │  ← Defaults to today
│  📅 Nov 13, 2025            │
│                             │
│  VENUE RATING: ⭐⭐⭐⭐⭐      │  ← Optional
│                             │
│  BAND RATING: ⭐⭐⭐⭐⭐       │  ← Optional
│                             │
│  📷 [Add Photo]             │  ← Optional
│                             │
│  💭 How was the show?       │  ← Optional review
│  [Text area]                │
│                             │
│  🏷️ Tag Friends             │  ← Optional
│                             │
│  [Cancel]      [Check-In ✓] │
└─────────────────────────────┘
```

### Post Check-In Actions
1. Creates event if new (venue + band + date combo)
2. Saves check-in to database
3. Updates venue & band aggregate ratings
4. Posts to Activity Feed
5. Unlocks badges if earned
6. Sends notifications to tagged friends

---

## Discovery & Import Flow

### External Search Flow

**In Discover Tab:**
```
[Search External Sources] button
  ↓
┌─────────────────────────┐
│ Search Type:            │
│ ○ Venues (Foursquare)   │
│ ○ Bands (MusicBrainz)   │
└─────────────────────────┘
  ↓
[Search results from API]
  ↓
Each result shows:
• Name, location/genre
• Photo/image
• [Add to PitPulse] or [Already Added - View]
```

### Deduplication Logic

**Before allowing import:**
1. Check if `foursquare_place_id` exists in database
2. If exists → Show "Already in PitPulse - View & Check-In"
3. If new → Show "Add to PitPulse"

**Same for bands:**
1. Check if `musicbrainz_id` exists
2. Prevent duplicates automatically

### User-Created Entries

**For venues/bands not in external APIs:**
- Manual "Add Venue" / "Add Band" forms
- Required: Name + City (venues) or Name + Genre (bands)
- Stored with `source: 'user_created'`
- External ID fields remain NULL
- Badge system: 5+ check-ins → "Community Verified"

---

## Backend API Implementation

### New Services

```typescript
// Foursquare integration
class FoursquareService {
  async searchVenues(query: string, location?: LatLng): Promise<VenueResult[]>
  async getVenueDetails(placeId: string): Promise<VenueDetails>
  async importVenue(placeId: string): Promise<Venue>
}

// MusicBrainz integration
class MusicBrainzService {
  async searchArtists(query: string): Promise<ArtistResult[]>
  async getArtistDetails(mbid: string): Promise<ArtistDetails>
  async importBand(mbid: string): Promise<Band>
}

// Events management
class EventService {
  async createEvent(venueId: string, bandId: string, date: Date): Promise<Event>
  async getEventsByVenue(venueId: string): Promise<Event[]>
  async getEventsByBand(bandId: string): Promise<Event[]>
}

// Check-ins and social
class CheckinService {
  async createCheckin(userId: string, data: CheckinData): Promise<Checkin>
  async getActivityFeed(userId: string, filter: FeedFilter): Promise<Checkin[]>
  async toastCheckin(userId: string, checkinId: string): Promise<void>
  async commentOnCheckin(userId: string, checkinId: string, text: string): Promise<Comment>
}
```

### New API Endpoints

```
# External Discovery
GET  /api/discover/venues?q=search&lat=37.7&lng=-122.4
GET  /api/discover/bands?q=search
POST /api/venues/import              # Body: { foursquare_place_id }
POST /api/bands/import               # Body: { musicbrainz_id }

# Events
POST /api/events                     # Body: { venue_id, band_id, event_date }
GET  /api/events/:id
GET  /api/venues/:id/events
GET  /api/bands/:id/events

# Check-ins
POST /api/checkins                   # Body: CheckinData
GET  /api/checkins/feed?filter=friends|nearby|global
POST /api/checkins/:id/toast
POST /api/checkins/:id/comments
GET  /api/checkins/:id
DELETE /api/checkins/:id
```

---

## Environment Variables

```env
# Foursquare Places API
FOURSQUARE_API_KEY=HNBX3HDC233EL4A5CTBAXDX10G1ZUTFSY5ADPNIGSI5OJOC1

# MusicBrainz API (no key needed)
MUSICBRAINZ_USER_AGENT=PitPulse/1.0 (contact@pitpulse.com)
```

**Railway Deployment:**
- Add these variables to Railway dashboard
- Keep `.env` in `.gitignore` (never commit)

---

## Implementation Phases

### Phase 1: Database Schema
- [ ] Create migration for events table
- [ ] Create migration for checkins table
- [ ] Create migration for toasts & comments
- [ ] Alter venues table (add foursquare_place_id, source)
- [ ] Alter bands table (add musicbrainz_id, source)
- [ ] Run migrations on Railway database

### Phase 2: Backend API Services
- [ ] Implement FoursquareService
- [ ] Implement MusicBrainzService
- [ ] Implement EventService
- [ ] Implement CheckinService
- [ ] Create API routes for discovery
- [ ] Create API routes for events
- [ ] Create API routes for check-ins
- [ ] Test all endpoints

### Phase 3: Mobile App - Discovery
- [ ] Create Discover tab UI
- [ ] External search interface (venues/bands)
- [ ] Import flow ("Add to PitPulse")
- [ ] Deduplication checks

### Phase 4: Mobile App - Check-ins
- [ ] FAB implementation
- [ ] Check-in screen UI
- [ ] Dual rating system (venue + band)
- [ ] Event creation logic
- [ ] Photo upload integration

### Phase 5: Mobile App - Social
- [ ] Activity Feed tab
- [ ] Toast functionality
- [ ] Comments on check-ins
- [ ] Friends filter
- [ ] Nearby filter

### Phase 6: Polish & Testing
- [ ] Badge system
- [ ] Profile statistics
- [ ] Map view with venue pins
- [ ] Error handling
- [ ] Loading states
- [ ] End-to-end testing

---

## Success Metrics

**Beta Testing Goals:**
- 50+ venues added to database
- 100+ bands added to database
- 200+ check-ins created
- Users earning badges
- Activity feed engagement (toasts/comments)

**Technical Goals:**
- API response times < 500ms
- No duplicate venues/bands in database
- Proper rating aggregation
- Stable check-in flow

---

## Notes & Decisions

**Why Foursquare over Google Places?**
- $200/month free credits vs Google's paid-only model
- Foursquare is built for venue check-ins (perfect fit)
- 105M POI database globally
- 50 req/sec rate limit (plenty for beta)

**Why MusicBrainz?**
- 100% free, no API key required
- Millions of artists/bands
- Community-maintained (like Wikipedia)
- Simple HTTP API with JSON responses

**Why Events as Core Entity?**
- Matches real-world concert experience
- Allows multiple users to check into same show
- Separates venue quality from band performance
- Enables "what's playing tonight" features
- Supports concert discovery and planning

**Why Dual Ratings?**
- Venue quality independent of which band played
- Band rating independent of venue quality
- More useful aggregate data
- Better recommendations
- Mirrors how people actually think about concerts

---

## Open Questions & Future Enhancements

**For Later:**
- Friend system implementation
- Group/scene creation
- Verified venue accounts
- Band artist claims (like Untappd breweries)
- Tour tracking
- Setlist integration
- Ticket purchase integration
- Spotify integration for band discovery

**Deferred:**
- Push notifications
- Advanced badge logic
- Leaderboards
- Premium features

---

**Document Version:** 1.0
**Last Updated:** 2025-11-13
**Approved By:** User
**Ready for Implementation:** ✅ YES
