# 🎵 SoundCheck

A social concert check-in app — the Untappd of live music. Check in at shows, rate bands and venues, earn badges, and see what your friends are attending.

## 📱 Overview

**SoundCheck** is a cross-platform mobile application that allows music enthusiasts to:
- Discover concert venues and bands
- Check in at live shows with ratings and notes
- Earn badges based on activity
- Search and filter venues/bands by various criteria
- Build a profile and track activity

## 🏗️ Repository Structure

This is a monorepo containing both the backend API and the Flutter mobile application:

```
SoundCheckMobile/
├── backend/          # Node.js/Express/TypeScript API server
│   ├── migrations/  # node-pg-migrate SQL migrations
│   ├── src/         # Source code
│   └── README.md    # Backend-specific documentation
│
├── mobile/          # Flutter mobile application
│   ├── lib/        # Dart source code
│   ├── test/       # Unit and widget tests
│   └── README.md   # Mobile app-specific documentation
│
├── web/             # Astro static marketing, support, and legal website
│   ├── src/        # Pages, components, layouts, and styles
│   └── public/     # Brand assets and static files
│
└── README.md       # This file
```

## 🚀 Tech Stack

### Backend
- **Framework:** Express.js with TypeScript
- **Database:** PostgreSQL
- **Authentication:** JWT
- **Security:** Helmet, CORS, rate limiting
- **Deployment:** Railway

### Mobile Application
- **Framework:** Flutter (Material 3)
- **State Management:** Riverpod
- **Navigation:** GoRouter
- **Networking:** Dio
- **Data Models:** Freezed & JSON serializable
- **Secure Storage:** flutter_secure_storage

### Website
- **Framework:** Astro (static output)
- **Styling:** Tailwind CSS (glass-neon theme aligned with the mobile app)
- **Content:** Marketing/support pages; privacy and terms synced from repo root markdown at build time

## 📋 Getting Started

### Prerequisites

- **Backend:**
  - Node.js 18.x or later
  - PostgreSQL 12.x or later
  - npm 9.x or later

- **Mobile:**
  - Flutter SDK (>=3.2.0)
  - Dart SDK
  - iOS/Android development environment

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/DasBluEyedDevil/SoundCheckMobile.git
   cd SoundCheckMobile
   ```

2. **Set up and run the backend:**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   createdb soundcheck
   npm run migrate:up
   npm run dev
   ```
   
   See [backend/README.md](backend/README.md) for detailed backend setup instructions.

3. **Set up and run the mobile app:**
   ```bash
   cd mobile
   flutter pub get
   flutter pub run build_runner build --delete-conflicting-outputs
   flutter run
   ```
   
   See [mobile/README.md](mobile/README.md) for detailed mobile app setup instructions.

4. **Run the website:**
   ```bash
   npm install --prefix web
   npm run dev:web
   ```

   To verify a production build:
   ```bash
   npm run build:web
   ```

## 📚 Documentation

- **[AGENTS.md](AGENTS.md)** - Short agent entrypoint and repository map
- **[docs/agent/README.md](docs/agent/README.md)** - Agent-first knowledge base index
- **[backend/README.md](backend/README.md)** - Backend API setup and documentation
- **[mobile/README.md](mobile/README.md)** - Mobile app setup and documentation
- **[web/](web/)** - Website source
- **[backend/DEPLOYMENT.md](backend/DEPLOYMENT.md)** - Backend deployment notes
- **[PRIVACY_POLICY.md](PRIVACY_POLICY.md)** - Privacy policy

## 🔑 Key Features

### User Features
- User registration and authentication
- Profile management with stats
- Check-in creation and management
- Badge earning system
- Search and discovery

### Venue & Band Features
- Comprehensive venue listings
- Band information and discovery
- Rating system (1-5 stars)
- Image support
- Location-based search

### Gamification
- Activity-based badges
- Check-in milestones
- User statistics tracking

## 🔒 Security

- JWT-based authentication
- Secure password hashing
- Rate limiting
- Input validation
- CORS protection
- Secure storage for tokens

## 🤝 Contributing

This is a personal project, but suggestions and feedback are welcome. Please open an issue to discuss potential changes.

## 📄 License

Copyright © 2024-2026 SoundCheck. All rights reserved.

## 📞 Support

For issues or questions, please open an issue on GitHub.

---

**Built with ❤️ by DasBluEyedDevil**
