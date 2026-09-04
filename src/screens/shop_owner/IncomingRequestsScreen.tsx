// =============================================================================
// Shop Owner: Incoming Requests Screen
// =============================================================================
// Displays all pending doorstep repair requests submitted by customers,
// adhering to `design.md`, `new-screen-design`, and `photo-upload-flow`.
//
// Key features:
//   - Header with bold "Incoming Requests" and pending count badge
//   - Vertical list of pending request cards:
//     - Left: customer's uploaded photo thumbnail (rounded square with signed URL)
//     - Middle: device brand icon & device name (bold black text),
//               problem type icon & label (gray subtext)
//     - Top Right: submission time (small gray text)
//   - Ambient subtle card shadow, generous whitespace, no heavy borders
//   - Tapping any card navigates to OwnerRequestDetail
//   - Pull-to-refresh & auto-refresh on screen focus
//   - Clean empty state when no pending requests exist
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
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ShopOwnerStackParamList, RepairRequest, RepairPhoto } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { getSignedPhotoUrl } from '../../utils/storage';

type IncomingRequestsNavProp = NativeStackNavigationProp<ShopOwnerStackParamList, 'ShopOwnerHome'>;

interface RequestWithThumbnail extends RepairRequest {
  thumbnailUrl?: string | null;
}

export default function IncomingRequestsScreen() {
  const navigation = useNavigation<IncomingRequestsNavProp>();
  const { signOut } = useAuth();

  const [requests, setRequests] = useState<RequestWithThumbnail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Fetch all repair requests with status = 'pending' and their first photo thumbnail.
   */
  const fetchPendingRequests = useCallback(async () => {
    try {
      // 1. Fetch pending requests
      const { data: requestData, error: requestError } = await supabase
        .from('repair_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (requestError) {
        console.error('Error fetching incoming requests:', requestError.message);
        return;
      }

      const pendingList = (requestData as RepairRequest[]) || [];

      if (pendingList.length === 0) {
        setRequests([]);
        return;
      }

      // 2. Fetch associated photos for thumbnail preview
      const requestIds = pendingList.map((r) => r.id);
      const { data: photosData, error: photosError } = await supabase
        .from('repair_photos')
        .select('repair_request_id, photo_url')
        .in('repair_request_id', requestIds)
        .order('uploaded_at', { ascending: true });

      if (photosError) {
        console.warn('Could not fetch photo thumbnails:', photosError.message);
      }

      // Map request ID to its first photo storage path
      const firstPhotoMap: Record<string, string> = {};
      if (photosData) {
        for (const item of photosData as RepairPhoto[]) {
          if (!firstPhotoMap[item.repair_request_id]) {
            firstPhotoMap[item.repair_request_id] = item.photo_url;
          }
        }
      }

      // 3. Resolve signed URLs in parallel for privacy compliance
      const thumbnailMap: Record<string, string> = {};
      await Promise.all(
        Object.entries(firstPhotoMap).map(async ([reqId, storagePath]) => {
          try {
            const signedUrl = await getSignedPhotoUrl(storagePath, 3600);
            thumbnailMap[reqId] = signedUrl;
          } catch {
            // If signed URL generation fails, fallback gracefully
          }
        })
      );

      // 4. Combine into final list
      const itemsWithThumbnails: RequestWithThumbnail[] = pendingList.map((r) => ({
        ...r,
        thumbnailUrl: thumbnailMap[r.id] || null,
      }));

      setRequests(itemsWithThumbnails);
    } catch (err) {
      console.error('Unexpected error fetching incoming requests:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Re-fetch whenever the screen gains focus (e.g. returning after accepting/rejecting a request)
  useFocusEffect(
    useCallback(() => {
      fetchPendingRequests();
    }, [fetchPendingRequests])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchPendingRequests();
  };

  const handleSignOut = () => {
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
   * Get brand vector icon.
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
   * Get problem type vector icon.
   */
  const getProblemIcon = (problem: string): any => {
    const p = problem.toLowerCase();
    if (p.includes('screen')) return 'phone-portrait-outline';
    if (p.includes('battery')) return 'battery-dead-outline';
    if (p.includes('water')) return 'water-outline';
    if (p.includes('speaker')) return 'volume-mute-outline';
    if (p.includes('charging') || p.includes('port')) return 'flash-outline';
    return 'build-outline';
  };

  /**
   * Format submission time into human-friendly relative or date format.
   */
  const formatSubmissionTime = (isoString: string): string => {
    try {
      const now = new Date();
      const date = new Date(isoString);
      const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      if (diffSec < 172800) return 'Yesterday';
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  /**
   * Render individual incoming request card per design.md:
   *  - Left: customer's uploaded photo thumbnail (rounded square)
   *  - Middle: device brand icon and device name (bold black text),
   *            problem type icon and label (gray subtext)
   *  - Top Right: submission time (small gray text)
   *  - Subtle ambient shadow, no heavy borders
   */
  const renderRequestCard = ({ item }: { item: RequestWithThumbnail }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('OwnerRequestDetail', { requestId: item.id })}
      >
        <View style={styles.cardContent}>
          {/* Customer's Uploaded Photo Thumbnail (Left, rounded square) */}
          <View style={styles.thumbnailContainer}>
            {item.thumbnailUrl ? (
              <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnailImage} />
            ) : (
              <View style={styles.thumbnailFallback}>
                <Ionicons name={getBrandIcon(item.brand)} size={28} color="#000000" />
              </View>
            )}
          </View>

          {/* Middle: Brand/Device Info & Problem Type */}
          <View style={styles.cardInfo}>
            {/* Top row: Device name & submission time */}
            <View style={styles.cardTopRow}>
              <View style={styles.brandBadge}>
                <Ionicons
                  name={getBrandIcon(item.brand)}
                  size={12}
                  color="#000000"
                  style={styles.brandBadgeIcon}
                />
                <Text style={styles.brandBadgeText}>{item.brand.toUpperCase()}</Text>
              </View>
              {/* Submission time (top right, small gray text) */}
              <Text style={styles.submissionTimeText}>
                {formatSubmissionTime(item.created_at)}
              </Text>
            </View>

            {/* Device Name (bold black text) */}
            <Text style={styles.deviceNameText} numberOfLines={1}>
              {item.device_name}
            </Text>

            {/* Problem Type: Icon and label side-by-side (gray subtext) */}
            <View style={styles.problemRow}>
              <Ionicons
                name={getProblemIcon(item.problem_type)}
                size={14}
                color="#8A8A8A"
                style={styles.problemIcon}
              />
              <Text style={styles.problemTypeText} numberOfLines={1}>
                {item.problem_type}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  /**
   * Empty state when no pending requests exist.
   */
  const renderEmptyState = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="checkmark-done-circle-outline" size={44} color="#000000" />
        </View>
        <Text style={styles.emptyTitle}>All Caught Up!</Text>
        <Text style={styles.emptySubtitle}>
          There are no pending doorstep repair requests right now. When customers submit requests,
          they will appear here.
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>Incoming Requests</Text>
          {/* Small badge showing count of pending requests */}
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{requests.length}</Text>
          </View>
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
          <Text style={styles.loadingText}>Loading incoming requests...</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Header Bar
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
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.5,
    marginRight: 10,
  },
  countBadge: {
    backgroundColor: '#000000',
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
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
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8A8A8A',
  },

  // List
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },

  // Request Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
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
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Customer's photo thumbnail (left, rounded square)
  thumbnailContainer: {
    width: 68,
    height: 68,
    borderRadius: 14,
    backgroundColor: '#F7F7F7',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  thumbnailFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },

  // Middle info
  cardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandBadgeIcon: {
    marginRight: 4,
  },
  brandBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A8A8A',
    letterSpacing: 0.5,
  },
  submissionTimeText: {
    fontSize: 12,
    color: '#8A8A8A',
    fontWeight: '500',
  },
  deviceNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  problemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  problemIcon: {
    marginRight: 6,
  },
  problemTypeText: {
    fontSize: 13,
    color: '#666666',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 72,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
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
  },
});
