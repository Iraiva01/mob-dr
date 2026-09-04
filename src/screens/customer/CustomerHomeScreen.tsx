// =============================================================================
// Customer Home Screen (Placeholder)
// =============================================================================
// Will show a list of the customer's repair requests with status badges.
// For now, just a labeled placeholder to verify navigation works.
// =============================================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function CustomerHomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Repairs</Text>
      <Text style={styles.subtitle}>Your repair requests will appear here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888888',
  },
});
