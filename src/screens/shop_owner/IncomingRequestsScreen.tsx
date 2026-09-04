// =============================================================================
// Incoming Requests Screen (Placeholder)
// =============================================================================
// Shop owner's view of all pending repair requests — thumbnails, brand/device,
// problem type, and submission time. Tapping opens OwnerRequestDetailScreen.
// =============================================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function IncomingRequestsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Incoming Requests</Text>
      <Text style={styles.subtitle}>Pending repair requests will appear here</Text>
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
