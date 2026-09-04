// =============================================================================
// App Navigator (Root)
// =============================================================================
// The top-level root navigator that controls role-based screen routing.
// Strictly adheres to the `role-based-navigation` skill:
//
// Decision logic:
//   1. isLoading === true || (user && !userRole) → Show centered loading spinner
//   2. !user                                    → Show AuthNavigator (Login / Register)
//   3. userRole === 'customer'                   → Show CustomerStack
//   4. userRole === 'shop_owner'                 → Show ShopOwnerStack
//
// Both roles share this single app binary, but are routed into mutually
// exclusive top-level navigation stacks based on their verified role.
// =============================================================================

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import AuthNavigator from './AuthNavigator';
import CustomerStack from './CustomerStack';
import ShopOwnerStack from './ShopOwnerStack';

export default function AppNavigator() {
  const { user, userRole, isLoading } = useAuth();

  // Show a loading screen while auth state is resolving or role profile is loading.
  // This prevents brief flashes of the login screen or mismatched views.
  if (isLoading || (user && !userRole)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {/* 1. Unauthenticated: Auth flow (Login / Signup) */}
      {!user && <AuthNavigator />}

      {/* 2. Customer: CustomerStack (mutually exclusive) */}
      {user && userRole === 'customer' && <CustomerStack />}

      {/* 3. Shop Owner: ShopOwnerStack (mutually exclusive) */}
      {user && userRole === 'shop_owner' && <ShopOwnerStack />}
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
