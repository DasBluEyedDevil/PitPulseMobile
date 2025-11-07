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
**Task**: Fixed Railway deployment build failure (caused by Flutter migration project restructuring)
**Status**: Completed ✅
**Commits**: 716b70b, a02f7aa
**Details**:
- **Root Cause**: During Flutter migration, project was restructured into monorepo with `backend/` and `mobile/` directories, but Railway deployment configuration wasn't updated to reflect new structure
- **Solution**: Created root-level `package.json` with npm workspaces that delegates all commands to backend directory
- Created `nixpacks.toml`, `build.sh`, and `start.sh` for Nixpacks configuration
- Updated `backend/tsconfig.json` to exclude test files from production builds
- When Railway runs `npm install && npm run build`, it now properly executes:
  - `cd backend && npm install`
  - `cd backend && npm run build`
- Successfully tested locally and pushed to trigger Railway rebuild

## Previous Work

### 2024-11-03 - Flutter Migration Complete
- Migrated mobile app from React Native to Flutter
- Implemented comprehensive feature-driven architecture
- Set up Riverpod state management and GoRouter navigation
- Created all repository implementations for API communication
- Implemented all core screens (Login, Register, Home, Venues, Bands, Profile, Reviews)
- See `mobile/CHANGELOG.md` for detailed Flutter app changelog
