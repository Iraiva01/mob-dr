// =============================================================================
// Customer Stack Navigator
// =============================================================================
// Top-level navigation stack for users with role === 'customer'.
// Gated strictly behind the customer role per `role-based-navigation` skill.
//
// Mutually exclusive with ShopOwnerStack:
// A customer user can only navigate within screens in this stack.
//
// Currently contains the placeholder CustomerHome screen ("My Repairs").
// Real screens (icon grid selector, submit request, request detail) will be
// attached in the next step.
// =============================================================================

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CustomerStackParamList } from '../types';
import CustomerHomeScreen from '../screens/customer/CustomerHomeScreen';

const Stack = createNativeStackNavigator<CustomerStackParamList>();

export default function CustomerStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen
        name="CustomerHome"
        component={CustomerHomeScreen}
        options={{ title: 'My Repairs' }}
      />
    </Stack.Navigator>
  );
}
