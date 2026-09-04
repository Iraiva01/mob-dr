// =============================================================================
// Shop Owner Stack Navigator
// =============================================================================
// Top-level navigation stack for users with role === 'shop_owner'.
// Gated strictly behind the shop owner role per `role-based-navigation` skill.
//
// Mutually exclusive with CustomerStack:
// A shop owner user can only navigate within screens in this stack.
//
// Currently contains the placeholder ShopOwnerHome screen ("Incoming Requests").
// Real screens (request cards, review/accept/reject, dashboard/stats) will be
// attached in the next step.
// =============================================================================

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ShopOwnerStackParamList, ShopOwnerTabParamList } from '../types';
import IncomingRequestsScreen from '../screens/shop_owner/IncomingRequestsScreen';
import OwnerDashboardScreen from '../screens/shop_owner/OwnerDashboardScreen';
import OwnerRequestDetailScreen from '../screens/shop_owner/OwnerRequestDetailScreen';

const Tab = createBottomTabNavigator<ShopOwnerTabParamList>();
const Stack = createNativeStackNavigator<ShopOwnerStackParamList>();

/**
 * Bottom tab bar for the shop owner role.
 * Matches Uber-inspired clean black & white aesthetic.
 */
function ShopOwnerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#000000',
        tabBarInactiveTintColor: '#8A8A8A',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F0F0F0',
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontWeight: '700',
          fontSize: 11,
          letterSpacing: 0.3,
        },
        tabBarIcon: ({ focused, color }) => {
          let iconName: any = 'receipt-outline';
          if (route.name === 'IncomingRequests') {
            iconName = focused ? 'file-tray-full' : 'file-tray-outline';
          } else if (route.name === 'OwnerDashboard') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          }
          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
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

export default function ShopOwnerStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen
        name="ShopOwnerHome"
        component={ShopOwnerTabs}
        options={{ title: 'Shop Owner' }}
      />
      <Stack.Screen
        name="OwnerRequestDetail"
        component={OwnerRequestDetailScreen}
        options={{ title: 'Request Detail' }}
      />
      <Stack.Screen
        name="OwnerDashboard"
        component={OwnerDashboardScreen}
        options={{ title: 'Dashboard' }}
      />
    </Stack.Navigator>
  );
}
