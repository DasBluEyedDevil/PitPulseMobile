.PHONY: help setup get clean build-runner watch test format lint run-dev run-prod build-apk build-ios

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

setup: ## Initial project setup
	@echo "Setting up Flutter project..."
	flutter pub get
	make build-runner

get: ## Get dependencies
	flutter pub get

clean: ## Clean build files
	flutter clean
	flutter pub get

build-runner: ## Generate code with build_runner
	flutter pub run build_runner build --delete-conflicting-outputs

watch: ## Watch and generate code on changes
	flutter pub run build_runner watch --delete-conflicting-outputs

test: ## Run tests
	flutter test

test-coverage: ## Run tests with coverage
	flutter test --coverage
	@echo "Coverage report generated at coverage/lcov.info"

format: ## Format code
	dart format lib/ test/

lint: ## Lint code
	flutter analyze

fix: ## Fix lint issues
	dart fix --apply

run-dev: ## Run app in debug mode
	flutter run

run-prod: ## Run app in release mode
	flutter run --release

build-apk: ## Build Android APK
	flutter build apk --release

build-bundle: ## Build Android App Bundle
	flutter build appbundle --release

build-ios: ## Build iOS app
	flutter build ios --release

build-ipa: ## Build iOS IPA
	flutter build ipa --release

doctor: ## Run Flutter doctor
	flutter doctor -v

upgrade: ## Upgrade dependencies
	flutter pub upgrade

outdated: ## Check for outdated dependencies
	flutter pub outdated

clean-build: clean build-runner ## Clean and regenerate code

# Development workflow commands
dev-setup: ## Complete development setup
	@echo "1. Installing dependencies..."
	make get
	@echo "2. Generating code..."
	make build-runner
	@echo "3. Running flutter doctor..."
	make doctor
	@echo ""
	@echo "✅ Setup complete! Run 'make run-dev' to start the app."

rebuild: ## Clean, get dependencies, and regenerate code
	make clean
	make get
	make build-runner

check: ## Run all checks (lint, format, test)
	@echo "Running format check..."
	dart format --output=none --set-exit-if-changed lib/ test/
	@echo "Running analysis..."
	make lint
	@echo "Running tests..."
	make test
	@echo "✅ All checks passed!"
