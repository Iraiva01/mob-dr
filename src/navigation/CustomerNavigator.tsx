// =============================================================================
// Customer Navigator
// =============================================================================
// Navigation structure for users with role === 'customer'.
//
// Architecture:
//   CustomerNavigator (Stack)
//     ├── CustomerTabs (Bottom Tabs)
//     │     ├── CustomerHome  — list of the customer's repair requests
//     │     └── NewRequest    — submit a new repair request
//     └── RequestDetail       — drill-in from the list to see one request
//
// Why a stack wrapping tabs?
// The detail screen should slide in over the tabs (full-screen), not appear
// as a tab itself. So the tab navigator is one "screen" inside a parent stack,
// and RequestDetail is a sibling screen in that stack.
// =============================================================================

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CustomerStackParamList, CustomerTabParamList } from '../types';
import CustomerHomeScreen from '../screens/customer/CustomerHomeScreen';
import NewRequestScreen from '../screens/customer/NewRequestScreen';
import RequestDetailScreen from '../screens/customer/RequestDetailScreen';

const Tab = createBottomTabNavigator<CustomerTabParamList>();
const Stack = createNativeStackNavigator<CustomerStackParamList>();

/**
 * Bottom tabs for the customer role.
 * Tab bar styling uses the Uber-inspired black & white palette.
 */
function CustomerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#000000',
        tabBarInactiveTintColor: '#888888',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F0F0F0',
        },
      }}
    >
      <Tab.Screen
        name="CustomerHome"
        component={CustomerHomeScreen}
        options={{ title: 'My Repairs' }}
      />
      <Tab.Screen
        name="NewRequest"
        component={NewRequestScreen}
        options={{ title: 'New Request' }}
      />
    </Tab.Navigator>
  );
}

/**
 * Full customer navigation stack.
 * Tabs are the default screen; RequestDetail slides in on top.
 */
export default function CustomerNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTintColor: '#000000',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen
        name="CustomerTabs"
        component={CustomerTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RequestDetail"
        component={RequestDetailScreen}
        options={{ title: 'Request Detail' }}
      />
    </Stack.Navigator>
  );
}
