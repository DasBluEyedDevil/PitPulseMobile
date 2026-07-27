plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
    id("com.google.gms.google-services")
}

val releaseInputNames = listOf(
    "SOUNDCHECK_GOOGLE_SERVICES_JSON_PATH",
    "SOUNDCHECK_ANDROID_KEYSTORE_PATH",
    "SOUNDCHECK_ANDROID_KEYSTORE_PASSWORD",
    "SOUNDCHECK_ANDROID_KEY_ALIAS",
    "SOUNDCHECK_ANDROID_KEY_PASSWORD",
)

fun releaseInput(name: String): String = System.getenv(name)?.trim().orEmpty()

val validateReleaseInputs = tasks.register("validateReleaseInputs") {
    group = "verification"
    description = "Fails release tasks when required external release inputs are absent."

    doLast {
        val missing = releaseInputNames.filter { releaseInput(it).isEmpty() }
        if (missing.isNotEmpty()) {
            throw GradleException(
                "Release build requires these environment variables: ${missing.joinToString(", ")}",
            )
        }

        val googleServices = file(releaseInput("SOUNDCHECK_GOOGLE_SERVICES_JSON_PATH"))
        val keystore = file(releaseInput("SOUNDCHECK_ANDROID_KEYSTORE_PATH"))
        if (!googleServices.isFile) {
            throw GradleException("SOUNDCHECK_GOOGLE_SERVICES_JSON_PATH must reference a readable file")
        }
        if (!keystore.isFile) {
            throw GradleException("SOUNDCHECK_ANDROID_KEYSTORE_PATH must reference a readable file")
        }
    }
}

val prepareReleaseGoogleServices = tasks.register<Copy>("prepareReleaseGoogleServices") {
    group = "build setup"
    description = "Copies the external Google Services configuration into the ignored Android app path."
    dependsOn(validateReleaseInputs)
    from(providers.provider { file(releaseInput("SOUNDCHECK_GOOGLE_SERVICES_JSON_PATH").ifBlank { "missing-google-services.json" }) })
    into(layout.projectDirectory.dir("app"))
    rename { "google-services.json" }
}

android {
    namespace = "com.soundcheck.app"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        isCoreLibraryDesugaringEnabled = true
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    signingConfigs {
        create("release") {
            keyAlias = releaseInput("SOUNDCHECK_ANDROID_KEY_ALIAS")
            keyPassword = releaseInput("SOUNDCHECK_ANDROID_KEY_PASSWORD")
            storeFile = file(releaseInput("SOUNDCHECK_ANDROID_KEYSTORE_PATH").ifBlank { "missing-release-keystore" })
            storePassword = releaseInput("SOUNDCHECK_ANDROID_KEYSTORE_PASSWORD")
        }
    }

    defaultConfig {
        applicationId = "com.soundcheck.app"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")

            // Enable code shrinking and obfuscation for release builds
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
}

tasks.configureEach {
    if (name.contains("Release", ignoreCase = true) && name !in setOf("validateReleaseInputs", "prepareReleaseGoogleServices")) {
        dependsOn(prepareReleaseGoogleServices)
    }
}

tasks.register("verifyReleaseCertificate") {
    group = "verification"
    description = "Verifies the signed release AAB and reports only its SHA-256 certificate fingerprint."
    dependsOn("bundleRelease")

    doLast {
        val bundle = layout.buildDirectory.file("outputs/bundle/release/app-release.aab").get().asFile
        if (!bundle.isFile) {
            throw GradleException("Expected release bundle at ${bundle.absolutePath}")
        }

        val output = providers.exec {
            commandLine("keytool", "-printcert", "-jarfile", bundle.absolutePath)
        }.standardOutput.asText.get()

        val fingerprint = Regex("SHA256:\\s*([0-9A-F:]+)", RegexOption.IGNORE_CASE)
            .find(output)
            ?.groupValues
            ?.get(1)
            ?: throw GradleException("Unable to read a SHA-256 certificate fingerprint from the release AAB")
        logger.lifecycle("Verified release AAB SHA-256 certificate fingerprint: $fingerprint")
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_11
    }
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.5")

    androidTestImplementation("androidx.test:core-ktx:1.7.0")
    androidTestImplementation("androidx.test:runner:1.7.0")
    androidTestImplementation("androidx.test.ext:junit-ktx:1.3.0")
    androidTestImplementation("androidx.test.uiautomator:uiautomator:2.3.0")
    androidTestImplementation("junit:junit:4.13.2")
    androidTestImplementation("tools.fastlane:screengrab:2.1.1")
}

flutter {
    source = "../.."
}
