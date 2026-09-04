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
import { ShopOwnerStackParamList } from '../types';
import IncomingRequestsScreen from '../screens/shop_owner/IncomingRequestsScreen';
import OwnerRequestDetailScreen from '../screens/shop_owner/OwnerRequestDetailScreen';

const Stack = createNativeStackNavigator<ShopOwnerStackParamList>();

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
        component={IncomingRequestsScreen}
        options={{ title: 'Incoming Requests' }}
      />
      <Stack.Screen
        name="OwnerRequestDetail"
        component={OwnerRequestDetailScreen}
        options={{ title: 'Request Detail' }}
      />
    </Stack.Navigator>
  );
}
