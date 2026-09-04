// =============================================================================
// App Navigator (Root)
// =============================================================================
// Controls the top-level app state:
//   1. isLoading === true → Show centered loading indicator.
//   2. !user             → Show AuthNavigator (Login / Register screens).
//   3. user !== null      → Show SessionConfirmedScreen to confirm active session
//                           and role loaded from `public.users`.
//
// NOTE: Post-login customer and shop owner navigation stacks are kept ready
// and will be activated once post-login navigation is requested.
// =============================================================================

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import AuthNavigator from './AuthNavigator';
import SessionConfirmedScreen from '../screens/auth/SessionConfirmedScreen';

export default function AppNavigator() {
  const { user, isLoading } = useAuth();

  // While checking for an existing session on app launch
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!user ? (
        // Unauthenticated → Login / Signup screens
        <AuthNavigator />
      ) : (
        // Authenticated → Confirms active user session and role
        <SessionConfirmedScreen />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
