fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## Android

### android build_beta

```sh
[bundle exec] fastlane android build_beta
```

Build the Android App Bundle used by Google Play beta tracks

### android screenshots

```sh
[bundle exec] fastlane android screenshots
```

Copy curated Android screenshots into Fastlane Play metadata

### android capture_store_screenshots

```sh
[bundle exec] fastlane android capture_store_screenshots
```

Capture Android screenshots from an emulator or device with screengrab

### android beta

```sh
[bundle exec] fastlane android beta
```

Upload metadata, screenshots, and the AAB to a Google Play beta track

### android validate_play_credentials

```sh
[bundle exec] fastlane android validate_play_credentials
```

Validate Google Play service account credentials without uploading

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
