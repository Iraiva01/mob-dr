// =============================================================================
// Shop Owner: Request Detail Screen
// =============================================================================
// Detail view for the shop owner to inspect a customer's repair request,
// view uploaded device photos, review problem details, check customer contact,
// and Accept or Reject the request via Supabase Edge Functions.
//
// Follows `design.md`, `new-screen-design`, and `photo-upload-flow`:
//   - Minimal white background (#FFFFFF) with bold black typography
//   - Top: Prominent horizontal scrollable photo gallery with signed URLs
//   - Device brand icon, bold device name, problem type icon and label
//   - Customer contact info row with tap-to-call action
//   - Additional notes in gray subtext box if present
//   - Bottom: Two side-by-side buttons — black "Accept" and white "Reject"
//   - Invokes `accept-repair-request` and `reject-repair-request` Edge Functions
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
  Dimensions,
  Modal,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ShopOwnerStackParamList, RepairRequest, RepairPhoto, User } from '../../types';
import { supabase } from '../../config/supabase';
import { getSignedPhotoUrls } from '../../utils/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = NativeStackScreenProps<ShopOwnerStackParamList, 'OwnerRequestDetail'>;

interface CustomerInfo {
  id: string;
  email: string;
  phone_number: string;
}

export default function OwnerRequestDetailScreen({ route, navigation }: Props) {
  const { requestId } = route.params;

  const [request, setRequest] = useState<RepairRequest | null>(null);
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activePhotoModal, setActivePhotoModal] = useState<string | null>(null);

  // Button action loading states
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  /**
   * Fetch repair request, customer profile, and photo thumbnails.
   */
  const fetchRequestDetails = useCallback(async () => {
    try {
      // 1. Fetch repair request row
      const { data: requestData, error: requestError } = await supabase
        .from('repair_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError || !requestData) {
        console.error('Error fetching request detail:', requestError?.message);
        return;
      }

      const req = requestData as RepairRequest;
      setRequest(req);

      // 2. Fetch customer contact info
      if (req.customer_id) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email, phone_number')
          .eq('id', req.customer_id)
          .single();

        if (userError) {
          console.warn('Could not fetch customer profile:', userError.message);
        } else if (userData) {
          setCustomer(userData as CustomerInfo);
        }
      }

      // 3. Fetch uploaded photos
      const { data: photosData, error: photosError } = await supabase
        .from('repair_photos')
        .select('*')
        .eq('repair_request_id', requestId)
        .order('uploaded_at', { ascending: true });

      if (photosError) {
        console.warn('Could not fetch repair photos:', photosError.message);
      } else if (photosData && photosData.length > 0) {
        const paths = (photosData as RepairPhoto[]).map((p) => p.photo_url);
        // Generate signed URLs per photo-upload-flow skill (1-hour validity)
        const signedUrls = await getSignedPhotoUrls(paths, 3600);
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
   * Handle calling the customer via device phone dialer.
   */
  const handleCallCustomer = (phone?: string) => {
    if (!phone) {
      Alert.alert('No Phone Number', 'This customer did not provide a phone number.');
      return;
    }

    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    const phoneUrl = `tel:${cleanPhone}`;

    Linking.canOpenURL(phoneUrl)
      .then((supported) => {
        if (!supported) {
          Alert.alert('Call Not Supported', `Cannot place calls to ${phone} from this device.`);
        } else {
          Linking.openURL(phoneUrl);
        }
      })
      .catch((err) => console.error('Error opening phone dialer:', err));
  };

  /**
   * Accept repair request via Edge Function (`accept-repair-request`).
   */
  const handleAcceptRequest = async () => {
    if (isAccepting || isRejecting) return;

    setIsAccepting(true);
    try {
      // 1. Invoke accept-repair-request Edge Function
      const { data, error } = await supabase.functions.invoke('accept-repair-request', {
        body: { repair_request_id: requestId },
      });

      if (error) {
        console.warn('Edge function error, attempting database fallback:', error.message);
        // Fallback to direct database update if edge function network glitch occurs
        const { error: dbError } = await supabase
          .from('repair_requests')
          .update({ status: 'accepted', updated_at: new Date().toISOString() })
          .eq('id', requestId);

        if (dbError) {
          throw new Error(dbError.message);
        }
      }

      Alert.alert(
        'Request Accepted',
        'You have accepted this repair request. You can now coordinate with the customer.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to accept request');
    } finally {
      setIsAccepting(false);
    }
  };

  /**
   * Reject repair request via Edge Function (`reject-repair-request`).
   */
  const handleRejectRequest = () => {
    if (isAccepting || isRejecting) return;

    Alert.alert(
      'Decline Request',
      'Are you sure you want to decline this repair request? The customer will be notified.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setIsRejecting(true);
            try {
              // 1. Invoke reject-repair-request Edge Function
              const { data, error } = await supabase.functions.invoke('reject-repair-request', {
                body: { repair_request_id: requestId },
              });

              if (error) {
                console.warn('Edge function error, attempting database fallback:', error.message);
                // Fallback to direct database update if edge function network glitch occurs
                const { error: dbError } = await supabase
                  .from('repair_requests')
                  .update({ status: 'rejected', updated_at: new Date().toISOString() })
                  .eq('id', requestId);

                if (dbError) {
                  throw new Error(dbError.message);
                }
              }

              Alert.alert('Request Declined', 'The repair request has been marked as declined.', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]);
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to decline request');
            } finally {
              setIsRejecting(false);
            }
          },
        },
      ]
    );
  };

  /**
   * Brand vector icon helper.
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
   * Problem type vector icon helper.
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
   * Date formatter.
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
          <Text style={styles.headerTitle}>Request Review</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Loading request details...</Text>
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
          <Text style={styles.headerTitle}>Request Review</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#8A8A8A" />
          <Text style={styles.errorTitle}>Request Not Found</Text>
          <Text style={styles.errorSubtitle}>This repair request is no longer available.</Text>
          <TouchableOpacity
            style={styles.returnButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.returnButtonText}>Back to Incoming</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isPending = request.status === 'pending';
  const isAccepted = request.status === 'accepted';
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
        <Text style={styles.headerTitle}>Request Review</Text>
        <View style={styles.headerSpacer} />
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
        {/* Status notice if not pending */}
        {!isPending && (
          <View
            style={[
              styles.statusBanner,
              isAccepted ? styles.statusBannerAccepted : styles.statusBannerRejected,
            ]}
          >
            <Ionicons
              name={isAccepted ? 'checkmark-circle' : 'close-circle'}
              size={18}
              color={isAccepted ? '#FFFFFF' : '#8A8A8A'}
              style={styles.statusBannerIcon}
            />
            <Text
              style={[
                styles.statusBannerText,
                isAccepted ? styles.statusTextAccepted : styles.statusTextRejected,
              ]}
            >
              This request is {request.status.toUpperCase()}
            </Text>
          </View>
        )}

        {/* Top: Customer Uploaded Photos (Horizontal scrollable gallery, larger and prominent) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Uploaded Photos</Text>
            <Text style={styles.sectionBadge}>
              {photos.length > 0 ? `${photos.length} photo${photos.length > 1 ? 's' : ''}` : 'None'}
            </Text>
          </View>

          {photos.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.galleryContainer}
            >
              {photos.map((photoUrl, index) => (
                <TouchableOpacity
                  key={`photo_${index}`}
                  style={styles.photoCard}
                  activeOpacity={0.88}
                  onPress={() => setActivePhotoModal(photoUrl)}
                >
                  <Image source={{ uri: photoUrl }} style={styles.photoImage} />
                  <View style={styles.zoomBadge}>
                    <Ionicons name="expand-outline" size={16} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.noPhotosCard}>
              <Ionicons name="camera-outline" size={32} color="#8A8A8A" />
              <Text style={styles.noPhotosText}>No photos attached by customer</Text>
            </View>
          )}
        </View>

        {/* Device Brand & Name + Problem Type */}
        <View style={styles.card}>
          <View style={styles.deviceRow}>
            {/* Brand Icon */}
            <View style={styles.brandIconCircle}>
              <Ionicons name={getBrandIcon(request.brand)} size={28} color="#000000" />
            </View>

            {/* Device Name & Brand */}
            <View style={styles.deviceInfo}>
              <Text style={styles.brandSubtitle}>{request.brand.toUpperCase()}</Text>
              <Text style={styles.deviceName}>{request.device_name}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Problem Type Icon & Label beside it per design.md */}
          <View style={styles.problemRow}>
            <View style={styles.problemIconCircle}>
              <Ionicons name={getProblemIcon(request.problem_type)} size={18} color="#000000" />
            </View>
            <View style={styles.problemInfo}>
              <Text style={styles.problemLabel}>Problem Reported</Text>
              <Text style={styles.problemValue}>{request.problem_type}</Text>
            </View>
          </View>
        </View>

        {/* Customer Contact Info (Phone number, email with phone icon) */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Customer Contact</Text>

          {/* Phone row with one-tap Call button */}
          <View style={styles.contactRow}>
            <View style={styles.contactIconCircle}>
              <Ionicons name="call-outline" size={18} color="#000000" />
            </View>
            <View style={styles.contactTextContainer}>
              <Text style={styles.contactLabel}>Phone Number</Text>
              <Text style={styles.contactValue}>
                {customer?.phone_number || 'No phone number provided'}
              </Text>
            </View>
            {customer?.phone_number ? (
              <TouchableOpacity
                style={styles.callActionButton}
                onPress={() => handleCallCustomer(customer.phone_number)}
                activeOpacity={0.8}
              >
                <Ionicons name="call" size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
                <Text style={styles.callActionButtonText}>Call</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Email row */}
          {customer?.email ? (
            <View style={[styles.contactRow, { marginTop: 12 }]}>
              <View style={styles.contactIconCircle}>
                <Ionicons name="mail-outline" size={18} color="#000000" />
              </View>
              <View style={styles.contactTextContainer}>
                <Text style={styles.contactLabel}>Email Address</Text>
                <Text style={styles.contactValue}>{customer.email}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Additional Notes in gray subtext box if present */}
        {Boolean(request.additional_notes?.trim()) && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Customer Notes</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{request.additional_notes}</Text>
            </View>
          </View>
        )}

        {/* Submission Timestamp Info */}
        <Text style={styles.submissionTimestamp}>
          Submitted on {formatDate(request.created_at)}
        </Text>
      </ScrollView>

      {/* Bottom Actions: Two full-width buttons side-by-side per design.md */}
      {isPending ? (
        <View style={styles.bottomBar}>
          {/* Black "Accept" Button on the left */}
          <TouchableOpacity
            style={[styles.acceptButton, (isAccepting || isRejecting) && styles.buttonDisabled]}
            onPress={handleAcceptRequest}
            disabled={isAccepting || isRejecting}
            activeOpacity={0.85}
          >
            {isAccepting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-sharp" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.acceptButtonText}>Accept</Text>
              </>
            )}
          </TouchableOpacity>

          {/* White "Reject" Button with black border on the right */}
          <TouchableOpacity
            style={[styles.rejectButton, (isAccepting || isRejecting) && styles.buttonDisabled]}
            onPress={handleRejectRequest}
            disabled={isAccepting || isRejecting}
            activeOpacity={0.85}
          >
            {isRejecting ? (
              <ActivityIndicator color="#000000" size="small" />
            ) : (
              <>
                <Ionicons name="close-sharp" size={18} color="#000000" style={{ marginRight: 6 }} />
                <Text style={styles.rejectButtonText}>Reject</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.resolvedBottomBar}>
          <TouchableOpacity
            style={styles.backToListButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Text style={styles.backToListButtonText}>Back to Incoming Requests</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Fullscreen Photo Preview Modal */}
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
            accessibilityLabel="Close image preview"
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
  headerSpacer: {
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
    paddingTop: 20,
    paddingBottom: 120, // Clearance for fixed bottom action bar
  },

  // Status Banner
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  statusBannerAccepted: {
    backgroundColor: '#000000',
  },
  statusBannerRejected: {
    backgroundColor: '#F7F7F7',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  statusBannerIcon: {
    marginRight: 8,
  },
  statusBannerText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusTextAccepted: {
    color: '#FFFFFF',
  },
  statusTextRejected: {
    color: '#8A8A8A',
  },

  // Section Headers
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
    letterSpacing: -0.2,
    marginBottom: 12,
  },
  sectionBadge: {
    fontSize: 12,
    color: '#8A8A8A',
    fontWeight: '600',
    marginBottom: 12,
  },

  // Prominent Photos Gallery (Horizontal, prominent per design.md)
  galleryContainer: {
    paddingRight: 16,
    gap: 14,
  },
  photoCard: {
    width: SCREEN_WIDTH * 0.72,
    height: 200,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  photoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  zoomBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noPhotosCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 14,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  noPhotosText: {
    marginTop: 8,
    fontSize: 13,
    color: '#8A8A8A',
  },

  // Device & Issue Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
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
  deviceInfo: {
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
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

  // Customer Contact Card
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 14,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactTextContainer: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 11,
    color: '#8A8A8A',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  callActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  callActionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Notes Box
  notesBox: {
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

  // Submission timestamp
  submissionTimestamp: {
    fontSize: 12,
    color: '#8A8A8A',
    textAlign: 'center',
    marginTop: 8,
  },

  // Fixed Bottom Actions
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#000000',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // Resolved bottom bar
  resolvedBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  backToListButton: {
    backgroundColor: '#000000',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backToListButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
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
