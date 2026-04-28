# Accessibility Testing Guide

This document outlines how to test SoundCheck's accessibility features using screen readers on Android (TalkBack) and iOS (VoiceOver).

## Overview

SoundCheck uses Flutter's Semantics widgets to provide screen reader support. Key areas with accessibility labels include:

- **Check-in Flow**: Event cards, check-in buttons, photo upload, rating sheets
- **Feed**: Feed cards, toast buttons, comment buttons, happening now section
- **Discover**: Search field, event cards, genre filters
- **Profile**: Stats display, badge collection, settings toggles
- **Badges**: Badge cards with progress/earned status

---

## Android Testing (TalkBack)

### Setup

1. Go to **Settings > Accessibility > TalkBack**
2. Enable TalkBack
3. Complete the tutorial if this is your first time

### Navigation Basics

- **Swipe right/left**: Move between elements
- **Double-tap**: Activate (tap) the current element
- **Two-finger scroll**: Scroll content
- **Explore by touch**: Drag finger to hear element descriptions

### Testing Checklist

#### Check-in Screen
- [ ] "Shows near you" header reads correctly
- [ ] Event cards announce: "[Event name] at [Venue]"
- [ ] Check-in buttons announce: "Check in at [Event] at [Venue]"
- [ ] Photo upload buttons announce: "Add photo from Camera/Gallery"
- [ ] Enrichment cards announce: "[Label], completed/not completed"

#### Feed Screen
- [ ] Feed cards announce: "Check-in by [User] at [Event]"
- [ ] Toast button announces: "Send toast reaction" or "Remove toast reaction"
- [ ] Comment button announces: "View [N] comments" or "No comments yet"
- [ ] Happening Now cards announce: "Live: [User] at [Event]"

#### Discover Screen
- [ ] Search field announces: "Search events, bands, venues"
- [ ] Event cards announce: "[Event] at [Venue] on [Date]"
- [ ] Genre chips announce: "[Genre] genre filter, selected/not selected"

#### Profile Screen
- [ ] Stats announce: "[N] Shows", "[N] Bands", etc.
- [ ] Badge items announce: "[Badge name], earned/in progress"
- [ ] Settings toggles announce: "[Setting], enabled/disabled"

---

## iOS Testing (VoiceOver)

### Setup

1. Go to **Settings > Accessibility > VoiceOver**
2. Enable VoiceOver
3. Optionally enable "VoiceOver Practice" to learn gestures

### Navigation Basics

- **Swipe right/left**: Move between elements
- **Double-tap**: Activate the current element
- **Three-finger scroll**: Scroll content
- **Touch and drag**: Explore elements under finger

### Testing Checklist

Use the same checklist as Android above. VoiceOver should read the same semantic labels.

---

## Common Issues & Workarounds

### Issue: Element not announced
**Cause**: Missing Semantics wrapper
**Fix**: Wrap element with `Semantics(label: '...')`

### Issue: Duplicate announcements
**Cause**: Multiple nested Semantics widgets
**Fix**: Use `excludeSemantics: true` on outer wrapper

### Issue: Interactive element not focusable
**Cause**: Missing `button: true` or `onTap` handler
**Fix**: Add `button: true` to Semantics or ensure GestureDetector has valid onTap

### Issue: Image not described
**Cause**: Decorative image without label
**Fix**: Add `semanticLabel` to Image widget or wrap in Semantics

---

## Accessibility Utilities

SoundCheck provides helper functions in `lib/src/shared/utils/a11y_utils.dart`:

```dart
// Check-in button
checkInSemantics(eventName: 'Rock Fest', venueName: 'Arena')
// -> "Check in at Rock Fest at Arena"

// Feed card
feedCardSemantics(username: 'John', eventName: 'Rock Fest', venueName: null)
// -> "Check-in by John at Rock Fest"

// Badge
badgeSemantics(badgeName: 'First Timer', isEarned: true, progress: null, total: null)
// -> "First Timer badge, earned"

// Stats
userStatsSemantics(showsAttended: 25, uniqueBands: 18)
// -> "25 shows attended, 18 unique bands"
```

---

## Resources

- [Flutter Accessibility](https://docs.flutter.dev/ui/accessibility-and-internationalization/accessibility)
- [Semantics Widget](https://api.flutter.dev/flutter/widgets/Semantics-class.html)
- [Android TalkBack Guide](https://support.google.com/accessibility/android/answer/6283677)
- [iOS VoiceOver Guide](https://support.apple.com/guide/iphone/turn-on-and-practice-voiceover-iph3e2e415f/ios)
