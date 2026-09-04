// =============================================================================
// Supabase Client Configuration
// =============================================================================
// Initializes the Supabase client with credentials from environment variables.
//
// How it works:
// 1. Expo automatically loads EXPO_PUBLIC_* vars from .env.local at build time.
// 2. We read them via process.env (Expo replaces these at compile time).
// 3. AsyncStorage is used as the persistence layer for Supabase Auth sessions,
//    so the user stays logged in across app restarts.
// 4. The URL polyfill is required for Supabase to work on React Native
//    (React Native's built-in URL implementation is incomplete).
// =============================================================================

import 'react-native-url-polyfill/auto'; // Must be imported before createClient
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Read Supabase credentials from environment variables.
// These are set in .env.local and never hardcoded.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Guard against missing env vars — fail fast with a clear message
// rather than a cryptic Supabase error at runtime.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables.\n' +
    'Create a .env.local file in the project root with:\n' +
    '  EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co\n' +
    '  EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key\n' +
    'See .env.local for details.'
  );
}

/**
 * The shared Supabase client instance.
 * Import this anywhere you need to interact with the database, auth, or storage:
 *
 *   import { supabase } from '@/config/supabase';
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use AsyncStorage so auth sessions persist across app restarts.
    // Without this, users would have to log in every time they open the app.
    storage: AsyncStorage,

    // Automatically refresh the JWT when it's about to expire.
    autoRefreshToken: true,

    // Persist the session in AsyncStorage.
    persistSession: true,

    // Disable the browser-specific URL detection (not applicable in React Native).
    detectSessionInUrl: false,
  },
});
