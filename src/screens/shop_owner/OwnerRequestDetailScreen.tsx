// =============================================================================
// Owner Request Detail Screen (Placeholder)
// =============================================================================
// Full detail view for the shop owner — photos, device info, customer contact,
// notes, and Accept/Reject action buttons.
// =============================================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ShopOwnerStackParamList } from '../../types';

type Props = NativeStackScreenProps<ShopOwnerStackParamList, 'OwnerRequestDetail'>;

export default function OwnerRequestDetailScreen({ route }: Props) {
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
