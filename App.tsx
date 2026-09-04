// =============================================================================
// App Entry Point
// =============================================================================
// Wraps the entire app in:
//   1. AuthProvider — so any screen can access auth state via useAuth()
//   2. AppNavigator — handles role-based routing (auth → customer | shop_owner)
//
// This file is intentionally minimal. All routing logic lives in AppNavigator,
// and all auth logic lives in AuthContext.
// =============================================================================

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <AuthProvider>
      {/* "dark" status bar = dark text on light background (matches our white theme) */}
      <StatusBar style="dark" />
      <AppNavigator />
    </AuthProvider>
  );
}
