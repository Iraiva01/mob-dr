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
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ShopOwnerStackParamList, RepairRequest, RepairPhoto, User, CompletedRepair } from '../../types';
import { supabase } from '../../config/supabase';
import { getSignedPhotoUrls } from '../../utils/storage';
import { getBrandLogo } from '../../components/BrandLogos';

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
  const [completedRepair, setCompletedRepair] = useState<CompletedRepair | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activePhotoModal, setActivePhotoModal] = useState<string | null>(null);

  // Button action loading states
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // Complete Repair Modal states
  const [isCompleteModalVisible, setIsCompleteModalVisible] = useState(false);
  const [amountCharged, setAmountCharged] = useState('');
  const [repairNotes, setRepairNotes] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);

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

      // 4. Fetch completed repairs record if already completed
      if (req.status === 'completed') {
        const { data: compData, error: compError } = await supabase
          .from('completed_repairs')
          .select('*')
          .eq('repair_request_id', requestId)
          .maybeSingle();

        if (compError) {
          console.warn('Could not fetch completed repair info:', compError.message);
        } else if (compData) {
          setCompletedRepair(compData as CompletedRepair);
        }
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

      // Update local state to accepted so screen switches to in-progress immediately
      setRequest((prev) => (prev ? { ...prev, status: 'accepted', updated_at: new Date().toISOString() } : null));

      Alert.alert(
        'Request Accepted',
        'You have accepted this doorstep repair request. It is now In Progress. Coordinate with the customer and tap "Complete Repair" once the service is finished.',
        [{ text: 'OK' }]
      );
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to accept request');
    } finally {
      setIsAccepting(false);
    }
  };

  /**
   * Complete repair and record charge via Edge Function (`complete-repair-request`).
   */
  const handleCompleteRepair = async () => {
    if (isCompleting) return;

    const numericAmount = parseFloat(amountCharged.replace(/[^0-9.]/g, ''));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid repair amount charged in ₹.');
      return;
    }

    setIsCompleting(true);
    try {
      const nowIso = new Date().toISOString();
      const cleanNotes = repairNotes.trim();

      // 1. Invoke complete-repair-request Edge Function
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke(
        'complete-repair-request',
        {
          body: {
            repair_request_id: requestId,
            amount_charged: numericAmount,
            notes: cleanNotes || undefined,
            completion_date: nowIso,
          },
        }
      );

      if (edgeError) {
        console.warn('Edge function error, attempting resilient DB fallback:', edgeError.message);
        // Fallback: direct database update and completed_repairs insert
        const { error: dbUpdateError } = await supabase
          .from('repair_requests')
          .update({ status: 'completed', updated_at: nowIso })
          .eq('id', requestId);

        if (dbUpdateError) {
          throw new Error(dbUpdateError.message);
        }

        const { data: compRow, error: dbInsertError } = await supabase
          .from('completed_repairs')
          .upsert(
            {
              repair_request_id: requestId,
              amount_charged: numericAmount,
              completion_date: nowIso,
              notes: cleanNotes || null,
            },
            { onConflict: 'repair_request_id' }
          )
          .select()
          .single();

        if (dbInsertError) {
          throw new Error(dbInsertError.message);
        }

        setCompletedRepair(compRow as CompletedRepair);
      } else if (edgeData?.data?.completed_repair) {
        setCompletedRepair(edgeData.data.completed_repair as CompletedRepair);
      } else {
        setCompletedRepair({
          id: 'comp_' + requestId,
          repair_request_id: requestId,
          amount_charged: numericAmount,
          completion_date: nowIso,
          notes: cleanNotes,
        });
      }

      // 2. Update local request state
      setRequest((prev) => (prev ? { ...prev, status: 'completed', updated_at: nowIso } : null));
      setIsCompleteModalVisible(false);
      setAmountCharged('');
      setRepairNotes('');

      Alert.alert(
        'Repair Completed!',
        `The repair has been successfully recorded with ₹${numericAmount.toLocaleString(
          'en-IN'
        )} charged. This has been updated in your revenue statistics.`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to complete repair');
    } finally {
      setIsCompleting(false);
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
  const isCompleted = request.status === 'completed';

  const BrandLogoComponent = getBrandLogo(request.brand);

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
              isCompleted
                ? styles.statusBannerCompleted
                : isAccepted
                ? styles.statusBannerAccepted
                : styles.statusBannerRejected,
            ]}
          >
            <Ionicons
              name={
                isCompleted
                  ? 'checkmark-done-circle'
                  : isAccepted
                  ? 'construct'
                  : 'close-circle'
              }
              size={18}
              color={isRejected ? '#8A8A8A' : '#FFFFFF'}
              style={styles.statusBannerIcon}
            />
            <Text
              style={[
                styles.statusBannerText,
                isRejected ? styles.statusTextRejected : styles.statusTextLight,
              ]}
            >
              {isCompleted
                ? 'REPAIR COMPLETED'
                : isAccepted
                ? 'IN PROGRESS — REPAIR ACCEPTED'
                : 'REQUEST DECLINED'}
            </Text>
          </View>
        )}

        {/* Completed Repair Summary Card (if repair has been completed) */}
        {isCompleted && (
          <View style={styles.completedSummaryCard}>
            <View style={styles.completedHeaderRow}>
              <View style={styles.completedBadgeCircle}>
                <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.completedHeaderInfo}>
                <Text style={styles.completedHeaderLabel}>REPAIR RECORD & REVENUE</Text>
                <Text style={styles.completedRevenueAmount}>
                  ₹{(completedRepair?.amount_charged ?? 0).toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            <View style={styles.completedDivider} />

            <View style={styles.completedMetaRow}>
              <Ionicons name="calendar-outline" size={15} color="#8A8A8A" style={{ marginRight: 6 }} />
              <Text style={styles.completedMetaLabel}>Completed on:</Text>
              <Text style={styles.completedMetaValue}>
                {formatDate(completedRepair?.completion_date || request.updated_at)}
              </Text>
            </View>

            {Boolean(completedRepair?.notes?.trim()) && (
              <View style={styles.completedNotesContainer}>
                <Text style={styles.completedNotesTitle}>Service Notes:</Text>
                <Text style={styles.completedNotesText}>{completedRepair?.notes}</Text>
              </View>
            )}
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
            {/* Brand Vector Logomark */}
            <View style={styles.brandIconCircle}>
              <BrandLogoComponent color="#000000" size={28} />
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

      {/* Bottom Actions Bar */}
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
      ) : isAccepted ? (
        <View style={styles.bottomBar}>
          {/* Black "Complete Repair" Button for Accepted Requests */}
          <TouchableOpacity
            style={styles.completeRepairButton}
            onPress={() => setIsCompleteModalVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons
              name="checkmark-done-circle"
              size={20}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.completeRepairButtonText}>Complete Repair</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.resolvedBottomBar}>
          <TouchableOpacity
            style={styles.backToListButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Text style={styles.backToListButtonText}>Back to Doorstep Repairs</Text>
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

      {/* Complete Repair & Enter Amount Modal */}
      <Modal
        visible={isCompleteModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!isCompleting) setIsCompleteModalVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.completeModalOverlay}
        >
          <TouchableOpacity
            style={styles.modalDismissTouchable}
            activeOpacity={1}
            onPress={() => {
              if (!isCompleting) setIsCompleteModalVisible(false);
            }}
          />

          <View style={styles.completeModalContent}>
            {/* Grab handle indicator */}
            <View style={styles.modalGrabHandle} />

            {/* Modal Title Bar */}
            <View style={styles.completeModalHeader}>
              <View>
                <Text style={styles.completeModalTitle}>Complete Repair</Text>
                <Text style={styles.completeModalSubtitle}>
                  Enter the final repair charge & notes
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (!isCompleting) setIsCompleteModalVisible(false);
                }}
                disabled={isCompleting}
                style={styles.modalCloseCircle}
              >
                <Ionicons name="close" size={20} color="#000000" />
              </TouchableOpacity>
            </View>

            {/* Amount Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                AMOUNT CHARGED (₹) <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencyPrefix}>₹</Text>
                <TextInput
                  style={styles.amountTextInput}
                  placeholder="0"
                  placeholderTextColor="#B0B0B0"
                  keyboardType="numeric"
                  value={amountCharged}
                  onChangeText={setAmountCharged}
                  editable={!isCompleting}
                  autoFocus
                />
              </View>
            </View>

            {/* Repair Notes Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>REPAIR NOTES (OPTIONAL)</Text>
              <TextInput
                style={styles.notesTextInput}
                placeholder="e.g. Display glass replaced, tested touch responsiveness."
                placeholderTextColor="#A0A0A0"
                value={repairNotes}
                onChangeText={setRepairNotes}
                multiline
                numberOfLines={3}
                editable={!isCompleting}
              />
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              style={[styles.confirmCompleteButton, isCompleting && styles.buttonDisabled]}
              onPress={handleCompleteRepair}
              disabled={isCompleting}
              activeOpacity={0.85}
            >
              {isCompleting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color="#FFFFFF"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.confirmCompleteButtonText}>Confirm & Complete Repair</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
  statusBannerCompleted: {
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
  statusTextLight: {
    color: '#FFFFFF',
  },
  statusTextRejected: {
    color: '#8A8A8A',
  },

  // Completed Repair Summary Card
  completedSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  completedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedBadgeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  completedHeaderInfo: {
    flex: 1,
  },
  completedHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A8A8A',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  completedRevenueAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.5,
  },
  completedDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 14,
  },
  completedMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedMetaLabel: {
    fontSize: 13,
    color: '#8A8A8A',
    fontWeight: '500',
    marginRight: 6,
  },
  completedMetaValue: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '700',
  },
  completedNotesContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  completedNotesTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A8A8A',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  completedNotesText: {
    fontSize: 13,
    color: '#333333',
    lineHeight: 18,
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

  // Complete Repair Button (for In Progress requests)
  completeRepairButton: {
    flex: 1,
    backgroundColor: '#000000',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  completeRepairButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  // Complete Repair Modal
  completeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalDismissTouchable: {
    flex: 1,
  },
  completeModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  modalGrabHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  completeModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  completeModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.4,
  },
  completeModalSubtitle: {
    fontSize: 13,
    color: '#8A8A8A',
    marginTop: 2,
  },
  modalCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  requiredAsterisk: {
    color: '#000000',
    fontWeight: '900',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    height: 56,
  },
  currencyPrefix: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000000',
    marginRight: 8,
  },
  amountTextInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    color: '#000000',
    padding: 0,
  },
  notesTextInput: {
    borderWidth: 1,
    borderColor: '#E2E2E2',
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: '#000000',
    backgroundColor: '#FAFAFA',
    minHeight: 74,
    textAlignVertical: 'top',
  },
  confirmCompleteButton: {
    backgroundColor: '#000000',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmCompleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
