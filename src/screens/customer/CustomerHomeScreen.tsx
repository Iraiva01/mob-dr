// =============================================================================
// Customer Home Screen (My Repairs)
// =============================================================================
// Customer dashboard displaying a list of all repair requests submitted by the
// logged-in customer.
//
// Follows `design.md` & `new-screen-design` skill:
//   - Pure white background (#FFFFFF), black accents (#000000)
//   - Top header with bold "My Repairs"
//   - Vertical list of repair request cards:
//     - Left-aligned brand icon in subtle circular container
//     - Device name in bold black text
//     - Problem type in gray subtext
//     - Status badge (black pill or white pill with black border)
//     - Submission date in gray subtext
//   - Floating black circular "+" button at bottom-right to submit a new request
//   - Clean empty state when no requests exist yet
// =============================================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CustomerStackParamList, RepairRequest, RepairStatus } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';

type CustomerHomeNavProp = NativeStackNavigationProp<CustomerStackParamList, 'CustomerHome'>;

export default function CustomerHomeScreen() {
  const navigation = useNavigation<CustomerHomeNavProp>();
  const { user, signOut } = useAuth();

  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Fetch all repair requests submitted by the authenticated customer.
   */
  const fetchRequests = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('repair_requests')
        .select('*')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching repair requests:', error.message);
        return;
      }

      setRequests((data as RepairRequest[]) || []);
    } catch (err) {
      console.error('Unexpected error fetching repair requests:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  // Re-fetch whenever the screen gains focus (e.g. after submitting a new request)
  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [fetchRequests])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchRequests();
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (err) {
            console.error('Sign out error:', err);
          }
        },
      },
    ]);
  };

  /**
   * Get vector icon name based on device brand.
   */
  const getBrandIcon = (brand: string): any => {
    const b = brand.toLowerCase();
    if (b.includes('apple')) return 'logo-apple';
    if (b.includes('samsung')) return 'phone-portrait-outline';
    if (b.includes('oneplus')) return 'hardware-chip-outline';
    if (b.includes('xiaomi')) return 'tablet-portrait-outline';
    return 'phone-portrait-outline';
  };

  /**
   * Format ISO submission date to clean human-readable text.
   */
  const formatSubmissionDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  /**
   * Render pill status badge matching `design.md` & `new-screen-design` skill.
   */
  const renderStatusBadge = (status: RepairStatus) => {
    const isDark = status === 'accepted' || status === 'completed';
    const isRejected = status === 'rejected';

    return (
      <View
        style={[
          styles.statusBadge,
          isDark
            ? styles.badgeDark
            : isRejected
            ? styles.badgeRejected
            : styles.badgePending,
        ]}
      >
        <Text
          style={[
            styles.statusBadgeText,
            isDark
              ? styles.badgeTextDark
              : isRejected
              ? styles.badgeTextRejected
              : styles.badgeTextPending,
          ]}
        >
          {status.toUpperCase()}
        </Text>
      </View>
    );
  };

  /**
   * Render individual repair request card.
   */
  const renderRequestCard = ({ item }: { item: RepairRequest }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('RequestDetail', { requestId: item.id })}
      >
        <View style={styles.cardHeader}>
          {/* Brand Icon Circle */}
          <View style={styles.brandIconContainer}>
            <Ionicons name={getBrandIcon(item.brand)} size={22} color="#000000" />
          </View>

          {/* Device Name & Problem */}
          <View style={styles.deviceInfoContainer}>
            <Text style={styles.deviceNameText} numberOfLines={1}>
              {item.device_name}
            </Text>
            <Text style={styles.problemTypeText} numberOfLines={1}>
              {item.problem_type}
            </Text>
          </View>

          {/* Status Badge */}
          {renderStatusBadge(item.status)}
        </View>

        {/* Card Footer: Brand & Submission Date */}
        <View style={styles.cardFooter}>
          <Text style={styles.brandSubtext}>{item.brand}</Text>
          <Text style={styles.dateSubtext}>
            Submitted: {formatSubmissionDate(item.created_at)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  /**
   * Empty state when customer has no submitted requests.
   */
  const renderEmptyState = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="construct-outline" size={40} color="#000000" />
        </View>
        <Text style={styles.emptyTitle}>No repairs requested</Text>
        <Text style={styles.emptySubtitle}>
          Need a phone repair? Tap the "+" button below to submit a new doorstep repair request.
        </Text>
        <TouchableOpacity
          style={styles.emptyActionButton}
          onPress={() => navigation.navigate('NewRequest')}
          activeOpacity={0.8}
        >
          <Text style={styles.emptyActionButtonText}>Submit a Request</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Repairs</Text>
          <Text style={styles.headerSubtitle}>Doorstep Repair Services</Text>
        </View>

        {/* Sign Out / Profile Button */}
        <TouchableOpacity
          style={styles.profileButton}
          onPress={handleSignOut}
          accessibilityLabel="Sign out"
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={22} color="#000000" />
        </TouchableOpacity>
      </View>

      {/* Main List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderRequestCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#000000"
              colors={['#000000']}
            />
          }
          ListEmptyComponent={renderEmptyState}
        />
      )}

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('NewRequest')}
        accessibilityLabel="Submit new repair request"
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8A8A8A',
    marginTop: 2,
  },
  profileButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // List
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 100, // Padding for FAB clearance
  },

  // Request Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    // Ambient subtle shadow matching Uber-style guidelines
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  deviceInfoContainer: {
    flex: 1,
    marginRight: 10,
  },
  deviceNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 3,
  },
  problemTypeText: {
    fontSize: 14,
    color: '#666666',
  },

  // Status Badges
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgePending: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  badgeDark: {
    backgroundColor: '#000000',
  },
  badgeRejected: {
    backgroundColor: '#F7F7F7',
    borderWidth: 1,
    borderColor: '#D0D0D0',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  badgeTextPending: {
    color: '#000000',
  },
  badgeTextDark: {
    color: '#FFFFFF',
  },
  badgeTextRejected: {
    color: '#8A8A8A',
  },

  // Card Footer
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F7F7F7',
  },
  brandSubtext: {
    fontSize: 12,
    color: '#8A8A8A',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateSubtext: {
    fontSize: 12,
    color: '#8A8A8A',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8A8A8A',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyActionButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  emptyActionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // Floating Action Button (FAB)
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
});
