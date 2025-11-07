# PitPulse Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Fixed - 2025-11-07
- **Railway Deployment Build Issue**: Fixed TypeScript compilation error during Railway/Nixpacks deployment
  - Added `nixpacks.toml` in repository root to configure monorepo structure
  - Configured Nixpacks to properly navigate to the `backend/` subdirectory for build and start commands
  - Updated `backend/tsconfig.json` to exclude test files from production builds
  - Build now successfully compiles TypeScript files to `dist/` directory
  - **Root Cause**: Nixpacks was running build commands at repository root instead of backend subdirectory
  - **Solution**: Configured build phases to use `cd backend &&` for install, build, and start commands

### Technical Details
- Created `nixpacks.toml` with proper phase configuration:
  - Install phase: `cd backend && npm ci --production=false`
  - Build phase: `cd backend && npm run build`
  - Start command: `cd backend && npm start`
- Updated TypeScript exclude list to prevent test files from being compiled in production

## Most Recent Task
**Date**: 2025-11-07
**Task**: Fixed Railway deployment build failure
**Status**: Completed
**Details**: The backend TypeScript build was failing on Railway because Nixpacks couldn't find source files. The issue was that Railway was building from the repository root, but the backend code is in a subdirectory. Created nixpacks.toml to configure the monorepo structure and excluded test files from production builds.

## Previous Work

### 2024-11-03 - Flutter Migration Complete
- Migrated mobile app from React Native to Flutter
- Implemented comprehensive feature-driven architecture
- Set up Riverpod state management and GoRouter navigation
- Created all repository implementations for API communication
- Implemented all core screens (Login, Register, Home, Venues, Bands, Profile, Reviews)
- See `mobile/CHANGELOG.md` for detailed Flutter app changelog
