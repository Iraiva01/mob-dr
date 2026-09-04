// =============================================================================
// Owner Dashboard Screen (Placeholder)
// =============================================================================
// Revenue stats and completed repairs list for the shop owner.
// Will show This Month / Last Month / All Time revenue, a chart,
// and a scrollable list of completed repairs with amounts.
// =============================================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function OwnerDashboardScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.subtitle}>Revenue & stats — coming soon</Text>
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
