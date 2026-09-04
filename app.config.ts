// =============================================================================
// Expo App Configuration (Dynamic)
// =============================================================================
// Using app.config.ts instead of app.json so we can:
//   1. Reference environment variables at build time
//   2. Add dynamic configuration later (e.g., different bundle IDs per environment)
//
// The static values from the original app.json are preserved here.
// =============================================================================

import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Mob Dr',
  slug: 'mob-dr-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',

  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.mobdr.app',
  },

  android: {
    package: 'com.mobdr.app',
    adaptiveIcon: {
      backgroundColor: '#FFFFFF',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
  },

  web: {
    favicon: './assets/favicon.png',
  },
});
