# Mob Dr — Debugging & Troubleshooting Guide

This guide compiles common issues, error messages, and verified solutions across the **Mob Dr** technology stack (Android Native, Gradle, React Native / Expo, and Supabase).

---

## 1. Gradle 9+ & Android Native Troubleshooting

### 1.1. Deprecated Groovy DSL Property Assignment Syntax
* **Symptom / Problem**: In `android/build/reports/problems/problems-report.html`, Gradle reports warnings:
  ```text
  The setter for this property is scheduled to be removed in Gradle 10.0.
  Use the assignment operator '=' instead.
  ```
* **Cause**: Gradle 9.0+ deprecates invoking property setters without an assignment operator in Groovy DSL (e.g. `namespace "foo"` or `compileSdk 36`).
* **Fix**: Ensure all property assignments in `android/build.gradle`, `android/app/build.gradle`, and module build scripts use explicit `=` syntax:
  ```groovy
  // In android/build.gradle
  maven { url = 'https://www.jitpack.io' }

  // In android/app/build.gradle
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
  ```

### 1.2. Upstream AGP & Kotlin Deprecations in Gradle 9.3.1
* **Symptom**: Warnings referencing `com.android.internal.application` or Kotlin `Usage.JAVA_API_JARS`.
* **Cause**: React Native 0.86.3 bundles Gradle 9.3.1. Certain internal calls inside Android Gradle Plugin 8.12.0 and Kotlin Gradle Plugin 2.1.20 use legacy Gradle APIs that Gradle 9 flags as scheduled for removal in Gradle 10.
* **Fix**: These warnings originate within Google/JetBrains binary plugin jars, not user code. Suppress verbose console spam by setting the following in `android/gradle.properties`:
  ```properties
  org.gradle.warning.mode=summary
  ```

### 1.3. JVM Out of Memory / Gradle Daemon Crash
* **Symptom**: `hs_err_pid*.log` generated in project root or build fails with `java.lang.OutOfMemoryError: Java heap space`.
* **Fix**: Ensure `android/gradle.properties` allocates sufficient memory and limits concurrent workers:
  ```properties
  org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m
  org.gradle.workers.max=2
  ```

### 1.4. Keystore & Release Signing Configuration
* **Symptom**: `Keystore file not found` or `Password verification failed` during release builds.
* **Fix**: Verify your release keystore parameters in `android/gradle.properties`:
  ```properties
  MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
  MYAPP_RELEASE_KEY_ALIAS=my-key-alias
  MYAPP_RELEASE_STORE_PASSWORD=your-password
  MYAPP_RELEASE_KEY_PASSWORD=your-password
  ```
  Ensure `my-release-key.keystore` is placed in `android/app/` (or generate a debug keystore if building in debug mode).

---

## 2. React Native & Metro Bundler

### 2.1. Metro Bundler Port 8081 Conflict
* **Symptom**: `Port 8081 is already in use by another process`.
* **Fix**: Kill existing Node/Metro processes or start with an alternate port:
  ```powershell
  # Find and kill process on port 8081 in Windows PowerShell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 8081).OwningProcess | Stop-Process -Force
  
  # Or start Expo with a custom port
  npx expo start --port 8088
  ```

### 2.2. Clearing Stale Cache
* **Symptom**: Screen updates do not reflect in the app, or bundle errors after package changes.
* **Fix**: Clear Expo / Metro bundler cache:
  ```bash
  npx expo start -c
  ```

### 2.3. Native Module Out of Sync
* **Symptom**: Red screen with `Unrecognized module` or native component linking errors.
* **Fix**: Clean and rebuild the native Android project:
  ```bash
  npx expo prebuild --clean
  cd android && ./gradlew clean && cd ..
  npx expo run:android
  ```

---

## 3. Supabase Auth & Role-Based Routing

### 3.1. Phone Number Login Fails
* **Symptom**: User enters phone number, but login throws `Invalid login credentials`.
* **Checklist**:
  1. Confirm the user registered their phone number during signup.
  2. Verify that the `get_email_for_phone` RPC function exists in PostgreSQL:
     ```sql
     SELECT * FROM get_email_for_phone('9876543210');
     ```
  3. Ensure phone numbers are stored without conflicting country code formatting inconsistencies.

### 3.2. User Assigned Incorrect Role
* **Symptom**: A shop owner logs in but sees the Customer Home screen.
* **Checklist**:
  1. Check the `public.users` table for the user's UUID:
     ```sql
     SELECT id, email, role FROM public.users WHERE email = 'owner@mobdr.com';
     ```
  2. If the role is `'customer'`, update it manually:
     ```sql
     UPDATE public.users SET role = 'shop_owner' WHERE email = 'owner@mobdr.com';
     ```
  3. Sign out in the mobile app and log back in to refresh `AuthContext`.

### 3.3. Infinite Recursion in PostgreSQL RLS Policies
* **Symptom**: Database queries fail with `infinite recursion detected in policy for relation "users"`.
* **Cause**: Querying `users` inside an RLS policy on `users` triggers recursive policy checks.
* **Fix**: Always use the security definer function `get_my_role()` rather than inline subqueries:
  ```sql
  -- Correct implementation
  CREATE POLICY "Users can read own record" ON public.users
  FOR SELECT USING (auth.uid() = id OR get_my_role() = 'shop_owner');
  ```

---

## 4. Photo Uploads & Supabase Storage

### 4.1. Upload Returns 403 Forbidden or Fails
* **Checklist**:
  1. Verify the `repair-photos` bucket exists in Supabase Storage.
  2. Confirm RLS policy on `storage.objects` allows authenticated users to insert:
     ```sql
     CREATE POLICY "Authenticated users can upload photos"
     ON storage.objects FOR INSERT TO authenticated
     WITH CHECK (bucket_id = 'repair-photos');
     ```

### 4.2. Photos Render as Blank or Broken Images
* **Cause**: `repair-photos` is a private bucket; direct public URLs will return 403 Forbidden.
* **Fix**: Always request a signed URL with a time-to-live (TTL) via `getSignedPhotoUrl` / `getSignedPhotoUrls` (`src/utils/storage.ts`):
  ```typescript
  const signedUrls = await getSignedPhotoUrls(photoPaths, 3600);
  ```

---

## 5. Supabase Edge Functions Debugging

### 5.1. Testing Edge Functions Locally
Run Edge Functions locally with Deno:
```bash
npx supabase functions serve --env-file .env.local
```

### 5.2. Function Returns 403 Role Forbidden
* **Cause**: The caller's JWT does not have the necessary role in `public.users`.
* **Fix**: Ensure the request includes the caller's Authorization header:
  ```typescript
  const { data, error } = await supabase.functions.invoke('complete-repair-request', {
    body: { repair_request_id: '...', amount_charged: 1500 },
  });
  ```
  The Edge Function reads `auth.uid()` from the JWT and queries `public.users` to confirm the role matches before executing.
