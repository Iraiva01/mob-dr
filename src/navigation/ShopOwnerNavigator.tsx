// =============================================================================
// Shop Owner Navigator
// =============================================================================
// Navigation structure for users with role === 'shop_owner'.
//
// Architecture:
//   ShopOwnerNavigator (Stack)
//     ├── OwnerTabs (Bottom Tabs)
//     │     ├── IncomingRequests  — list of pending repair requests
//     │     └── OwnerDashboard   — revenue stats and completed repairs
//     └── OwnerRequestDetail     — drill-in to review/accept/reject a request
//
// Same stack-over-tabs pattern as CustomerNavigator (see that file for rationale).
// =============================================================================

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ShopOwnerStackParamList, ShopOwnerTabParamList } from '../types';
import IncomingRequestsScreen from '../screens/shop_owner/IncomingRequestsScreen';
import OwnerDashboardScreen from '../screens/shop_owner/OwnerDashboardScreen';
import OwnerRequestDetailScreen from '../screens/shop_owner/OwnerRequestDetailScreen';

const Tab = createBottomTabNavigator<ShopOwnerTabParamList>();
const Stack = createNativeStackNavigator<ShopOwnerStackParamList>();

/**
 * Bottom tabs for the shop owner role.
 */
function OwnerTabs() {
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
        name="IncomingRequests"
        component={IncomingRequestsScreen}
        options={{ title: 'Requests' }}
      />
      <Tab.Screen
        name="OwnerDashboard"
        component={OwnerDashboardScreen}
        options={{ title: 'Dashboard' }}
      />
    </Tab.Navigator>
  );
}

/**
 * Full shop owner navigation stack.
 * Tabs are the default screen; OwnerRequestDetail slides in on top.
 */
export default function ShopOwnerNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTintColor: '#000000',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen
        name="OwnerTabs"
        component={OwnerTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="OwnerRequestDetail"
        component={OwnerRequestDetailScreen}
        options={{ title: 'Request Detail' }}
      />
    </Stack.Navigator>
  );
}
