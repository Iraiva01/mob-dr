# Android Development & Build Rules

These rules govern all Android native configuration, Gradle build scripts, and platform-specific code in the **Mob Dr** repository.

---

## 1. Gradle 9+ Groovy DSL Property Assignment Syntax

> [!IMPORTANT]
> React Native 0.86.3 bundles Gradle 9.3.1. In Gradle 9.0+, calling property setters without an assignment operator (`=`) is deprecated and will fail in Gradle 10.0.

### Mandatory Syntax
All property assignments in `android/build.gradle`, `android/app/build.gradle`, and any custom Gradle files **MUST** use the assignment operator `=`:

```groovy
// ✅ CORRECT (Gradle 9+ Compliant)
namespace = 'com.mobdr.mobileapp'
compileSdk = rootProject.ext.compileSdkVersion
buildToolsVersion = rootProject.ext.buildToolsVersion
ndkVersion = rootProject.ext.ndkVersion

defaultConfig {
    applicationId = 'com.mobdr.mobileapp'
    minSdkVersion = rootProject.ext.minSdkVersion
    targetSdkVersion = rootProject.ext.targetSdkVersion
    versionCode = 1
    versionName = "1.0.0"
}

buildTypes {
    release {
        signingConfig = signingConfigs.release
        shrinkResources = enableShrinkResources.toBoolean()
        minifyEnabled = enableMinifyInReleaseBuilds
        crunchPngs = enablePngCrunchInRelease.toBoolean()
    }
}

aaptOptions {
    ignoreAssetsPattern = '!.svn:!.git:!.ds_store:!*.scc:!CVS:!thumbs.db:!picasa.ini:!*~'
}

repositories {
    maven { url = 'https://www.jitpack.io' }
}
```

```groovy
// ❌ INCORRECT (Triggers Gradle 9 Deprecation Warnings)
namespace "com.mobdr.mobileapp"
compileSdk rootProject.ext.compileSdkVersion
versionCode 1
versionName "1.0.0"
maven { url 'https://www.jitpack.io' }
```

---

## 2. SDK, NDK, and Tooling Baseline

Maintain consistent toolchain versions defined in `android/build.gradle`:
- `compileSdkVersion = 36`
- `targetSdkVersion = 36`
- `minSdkVersion = 24` (Android 7.0 Nougat baseline)
- `buildToolsVersion = "36.0.0"`
- `ndkVersion = "27.1.12297006"`
- `kotlinVersion = "2.1.20"`

---

## 3. JVM Memory & Build Daemon Governance

To prevent Gradle daemon memory crashes (`hs_err_pid*.log`) on developer workstations:
1. `org.gradle.jvmargs` in `android/gradle.properties` must remain capped at `-Xmx4096m -XX:MaxMetaspaceSize=1024m`.
2. Limit max workers to avoid CPU starvation:
   ```properties
   org.gradle.workers.max=2
   ```
3. Suppress unavoidable upstream AGP/Kotlin internal deprecations:
   ```properties
   org.gradle.warning.mode=summary
   ```

---

## 4. Media Permissions & Image Handling (Android 13+)

- Android 13+ (API level 33+) requires granular media permissions (`android.permission.READ_MEDIA_IMAGES`) instead of broad `READ_EXTERNAL_STORAGE`.
- Handled via `expo-image-picker`. Always invoke with `mediaTypes: ImagePicker.MediaTypeOptions.Images` and client-side compression (`quality: 0.7`).
- Enforce customer photo upload limit (maximum 2 photos) to conserve device memory and bandwidth on cellular networks.

---

## 5. Keystore & Release Signing

- Release signing keys must never be committed to public repositories.
- Reference release credentials using `android/gradle.properties`:
  ```properties
  MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
  MYAPP_RELEASE_KEY_ALIAS=my-key-alias
  MYAPP_RELEASE_STORE_PASSWORD=...
  MYAPP_RELEASE_KEY_PASSWORD=...
  ```
- In `android/app/build.gradle`, check if the properties exist before applying `signingConfigs.release`.

---

## 6. Cross-Platform Parity Principle

Mob Dr will expand to iOS after the initial Android launch.
- **Rule**: Do NOT introduce Android-only native dependencies or custom Android Java/Kotlin modules unless an equivalent iOS implementation or cross-platform Expo library exists.
