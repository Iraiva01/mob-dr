// =============================================================================
// Customer Request Detail Screen
// =============================================================================
// Displays complete information for a specific repair request submitted by the
// customer, adhering to `design.md`, `new-screen-design`, and `photo-upload-flow`.
//
// Key features:
//   - Centered large status badge (black pill with white text)
//   - Brand icon and device name in bold
//   - Problem type icon and label side-by-side
//   - Horizontal scrollable photo gallery with short-lived signed URLs
//   - Fullscreen photo modal when tapping any thumbnail
//   - Additional notes in subtle gray container
//   - Connected dot timeline: Submitted → Acknowledged → In Progress → Completed
// =============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  ActivityIndicator,
  Modal,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CustomerStackParamList, RepairRequest, RepairPhoto, RepairStatus } from '../../types';
import { supabase } from '../../config/supabase';
import { getSignedPhotoUrls } from '../../utils/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type RequestDetailRouteProp = RouteProp<CustomerStackParamList, 'RequestDetail'>;
type RequestDetailNavProp = NativeStackNavigationProp<CustomerStackParamList, 'RequestDetail'>;

interface TimelineStep {
  key: string;
  title: string;
  description: string;
  isCompleted: boolean;
  isActive: boolean;
}

export default function RequestDetailScreen() {
  const route = useRoute<RequestDetailRouteProp>();
  const navigation = useNavigation<RequestDetailNavProp>();
  const { requestId } = route.params;

  const [request, setRequest] = useState<RepairRequest | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activePhotoModal, setActivePhotoModal] = useState<string | null>(null);

  /**
   * Fetch repair request details and photos with signed URLs.
   */
  const fetchRequestDetails = useCallback(async () => {
    try {
      // 1. Fetch request row
      const { data: requestData, error: requestError } = await supabase
        .from('repair_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError) {
        console.error('Error fetching repair request:', requestError.message);
        return;
      }

      setRequest(requestData as RepairRequest);

      // 2. Fetch associated photos
      const { data: photosData, error: photosError } = await supabase
        .from('repair_photos')
        .select('*')
        .eq('repair_request_id', requestId)
        .order('uploaded_at', { ascending: true });

      if (photosError) {
        console.error('Error fetching repair photos:', photosError.message);
      } else if (photosData && photosData.length > 0) {
        const filePaths = (photosData as RepairPhoto[]).map((p) => p.photo_url);
        // Generate signed URLs (1-hour validity per photo-upload-flow skill)
        const signedUrls = await getSignedPhotoUrls(filePaths, 3600);
        setPhotos(signedUrls);
      } else {
        setPhotos([]);
      }
    } catch (err) {
      console.error('Unexpected error fetching request details:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [requestId]);

  useEffect(() => {
    fetchRequestDetails();
  }, [fetchRequestDetails]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchRequestDetails();
  };

  /**
   * Get brand vector icon.
   */
  const getBrandIcon = (brand?: string): any => {
    if (!brand) return 'phone-portrait-outline';
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
  const getProblemIcon = (problem?: string): any => {
    if (!problem) return 'build-outline';
    const p = problem.toLowerCase();
    if (p.includes('screen')) return 'phone-portrait-outline';
    if (p.includes('battery')) return 'battery-dead-outline';
    if (p.includes('water')) return 'water-outline';
    if (p.includes('speaker')) return 'volume-mute-outline';
    if (p.includes('charging') || p.includes('port')) return 'flash-outline';
    return 'build-outline';
  };

  /**
   * Format ISO date string.
   */
  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  /**
   * Build the 4-step status timeline based on current status.
   * Steps: Submitted → Acknowledged → In Progress → Completed
   */
  const getTimelineSteps = (status?: RepairStatus): TimelineStep[] => {
    const isPending = status === 'pending';
    const isAccepted = status === 'accepted';
    const isCompleted = status === 'completed';
    const isRejected = status === 'rejected';

    return [
      {
        key: 'submitted',
        title: 'Submitted',
        description: 'Your doorstep repair request was received',
        isCompleted: true, // Always completed once submitted
        isActive: isPending,
      },
      {
        key: 'acknowledged',
        title: isRejected ? 'Declined' : 'Acknowledged',
        description: isRejected
          ? 'The shop was unable to accept this request'
          : isAccepted || isCompleted
          ? 'Shop owner accepted your repair request'
          : 'Shop owner reviewing your device issue',
        isCompleted: isAccepted || isCompleted,
        isActive: isPending && !isRejected,
      },
      {
        key: 'in_progress',
        title: 'In Progress',
        description: isCompleted
          ? 'Technician arrived and resolved the issue'
          : isAccepted
          ? 'Technician on schedule for doorstep repair'
          : 'Pending owner acknowledgment',
        isCompleted: isCompleted,
        isActive: isAccepted,
      },
      {
        key: 'completed',
        title: 'Completed',
        description: isCompleted
          ? 'Repair fulfilled & service closed'
          : 'Awaiting repair completion',
        isCompleted: isCompleted,
        isActive: false,
      },
    ];
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Details</Text>
          <View style={styles.headerRightSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Loading details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!request) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Details</Text>
          <View style={styles.headerRightSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#8A8A8A" />
          <Text style={styles.errorTitle}>Request Not Found</Text>
          <Text style={styles.errorSubtitle}>
            This repair request could not be found or has been removed.
          </Text>
          <TouchableOpacity
            style={styles.returnButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.returnButtonText}>Back to My Repairs</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const timelineSteps = getTimelineSteps(request.status);
  const isRejected = request.status === 'rejected';

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Details</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#000000"
            colors={['#000000']}
          />
        }
      >
        {/* Top Status Badge (Large black pill centered per design.md) */}
        <View style={styles.badgeContainer}>
          <View style={[styles.largeBadge, isRejected && styles.largeBadgeRejected]}>
            <Text style={[styles.largeBadgeText, isRejected && styles.largeBadgeTextRejected]}>
              {request.status.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.submissionDateText}>
            Submitted on {formatDate(request.created_at)}
          </Text>
        </View>

        {/* Device & Issue Overview Card */}
        <View style={styles.card}>
          <View style={styles.deviceRow}>
            {/* Brand Icon in subtle circle */}
            <View style={styles.brandIconCircle}>
              <Ionicons name={getBrandIcon(request.brand)} size={26} color="#000000" />
            </View>

            {/* Device Name & Brand Subtext */}
            <View style={styles.deviceTitleContainer}>
              <Text style={styles.brandSubtitle}>{request.brand.toUpperCase()}</Text>
              <Text style={styles.deviceName}>{request.device_name}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Problem Type with Icon side-by-side per design.md */}
          <View style={styles.problemRow}>
            <View style={styles.problemIconCircle}>
              <Ionicons name={getProblemIcon(request.problem_type)} size={18} color="#000000" />
            </View>
            <View style={styles.problemInfo}>
              <Text style={styles.problemLabel}>Reported Problem</Text>
              <Text style={styles.problemValue}>{request.problem_type}</Text>
            </View>
          </View>
        </View>

        {/* Uploaded Photos Section */}
        {photos.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Uploaded Photos</Text>
              <Text style={styles.sectionCountBadge}>{photos.length} attached</Text>
            </View>

            {/* Horizontal Scrollable Gallery */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.galleryContainer}
            >
              {photos.map((photoUrl, index) => (
                <TouchableOpacity
                  key={`photo_${index}`}
                  activeOpacity={0.85}
                  onPress={() => setActivePhotoModal(photoUrl)}
                  style={styles.photoCard}
                >
                  <Image source={{ uri: photoUrl }} style={styles.photoThumbnail} />
                  <View style={styles.photoZoomOverlay}>
                    <Ionicons name="scan-outline" size={16} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Additional Notes Section */}
        {Boolean(request.additional_notes?.trim()) && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Additional Notes</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{request.additional_notes}</Text>
            </View>
          </View>
        )}

        {/* Status Timeline (Bottom Section per design.md) */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Repair Timeline</Text>
          <View style={styles.timelineCard}>
            {timelineSteps.map((step, index) => {
              const isLast = index === timelineSteps.length - 1;
              const nextStep = !isLast ? timelineSteps[index + 1] : null;
              const isConnectingLineCompleted = Boolean(nextStep?.isCompleted);

              return (
                <View key={step.key} style={styles.timelineItem}>
                  {/* Left Column: Dot & Connecting Line */}
                  <View style={styles.timelineGraphicColumn}>
                    {/* Dot: filled black for completed, gray outline for pending */}
                    <View
                      style={[
                        styles.timelineDot,
                        step.isCompleted ? styles.dotCompleted : styles.dotPending,
                        step.isActive && styles.dotActive,
                      ]}
                    >
                      {step.isCompleted ? (
                        <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                      ) : (
                        <View style={styles.dotInnerPending} />
                      )}
                    </View>

                    {/* Connecting line */}
                    {!isLast && (
                      <View
                        style={[
                          styles.timelineLine,
                          isConnectingLineCompleted
                            ? styles.lineCompleted
                            : styles.linePending,
                        ]}
                      />
                    )}
                  </View>

                  {/* Right Column: Title & Description */}
                  <View style={[styles.timelineContent, isLast && styles.timelineContentLast]}>
                    <Text
                      style={[
                        styles.timelineStepTitle,
                        step.isCompleted ? styles.stepTitleCompleted : styles.stepTitlePending,
                      ]}
                    >
                      {step.title}
                    </Text>
                    <Text style={styles.timelineStepDescription}>{step.description}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Fullscreen Photo Modal */}
      <Modal
        visible={Boolean(activePhotoModal)}
        transparent
        animationType="fade"
        onRequestClose={() => setActivePhotoModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setActivePhotoModal(null)}
            accessibilityLabel="Close photo preview"
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {activePhotoModal && (
            <Image
              source={{ uri: activePhotoModal }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  headerRightSpacer: {
    width: 40,
  },

  // Loading & Error States
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8A8A8A',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#8A8A8A',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  returnButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  returnButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // Scroll Content
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
  },

  // Top Status Badge
  badgeContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  largeBadge: {
    backgroundColor: '#000000',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  largeBadgeRejected: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1.5,
    borderColor: '#CCCCCC',
  },
  largeBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  largeBadgeTextRejected: {
    color: '#8A8A8A',
  },
  submissionDateText: {
    marginTop: 8,
    fontSize: 13,
    color: '#8A8A8A',
  },

  // Device Overview Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  deviceTitleContainer: {
    flex: 1,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A8A8A',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  deviceName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.3,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F3F3',
    marginVertical: 16,
  },
  problemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  problemIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  problemInfo: {
    flex: 1,
  },
  problemLabel: {
    fontSize: 11,
    color: '#8A8A8A',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  problemValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
  },

  // Sections
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  sectionCountBadge: {
    fontSize: 12,
    color: '#8A8A8A',
    fontWeight: '600',
    marginBottom: 12,
  },

  // Photo Gallery
  galleryContainer: {
    paddingRight: 16,
    gap: 12,
  },
  photoCard: {
    width: 140,
    height: 140,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    position: 'relative',
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoZoomOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Notes
  notesCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  notesText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#555555',
  },

  // Status Timeline
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineGraphicColumn: {
    alignItems: 'center',
    width: 28,
    marginRight: 14,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCompleted: {
    backgroundColor: '#000000',
  },
  dotPending: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D0D0D0',
  },
  dotActive: {
    borderColor: '#000000',
  },
  dotInnerPending: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D0D0D0',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 36,
    marginVertical: 4,
  },
  lineCompleted: {
    backgroundColor: '#000000',
  },
  linePending: {
    backgroundColor: '#E5E5E5',
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 22,
  },
  timelineContentLast: {
    paddingBottom: 0,
  },
  timelineStepTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  stepTitleCompleted: {
    color: '#000000',
  },
  stepTitlePending: {
    color: '#8A8A8A',
  },
  timelineStepDescription: {
    fontSize: 12,
    color: '#8A8A8A',
    lineHeight: 17,
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalImage: {
    width: SCREEN_WIDTH * 0.92,
    height: '75%',
  },
});
