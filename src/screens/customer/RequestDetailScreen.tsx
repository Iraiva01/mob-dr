// =============================================================================
// Request Detail Screen (Placeholder)
// =============================================================================
// Customer view of a single repair request — brand, problem, photos, notes,
// and a status timeline (Submitted → Acknowledged → In Progress → Completed).
// =============================================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CustomerStackParamList } from '../../types';

type Props = NativeStackScreenProps<CustomerStackParamList, 'RequestDetail'>;

export default function RequestDetailScreen({ route }: Props) {
  const { requestId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Request Detail</Text>
      <Text style={styles.subtitle}>Request ID: {requestId}</Text>
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
