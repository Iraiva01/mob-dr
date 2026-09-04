// =============================================================================
// Submit New Request Screen
// =============================================================================
// Customer screen to submit a doorstep device repair request.
//
// Follows `design.md`, `new-screen-design`, `icon-grid-selector`, and
// `photo-upload-flow` skills:
//   - Step 1: Brand Selection via IconGridSelector (circular, row layout) + Model input
//   - Step 2: Problem Type Selection via IconGridSelector (square, 2-col grid, border highlight)
//   - Step 3: Photo Upload (dashed border box, max 2 photos with thumbnails & delete)
//   - Step 4: Additional Notes (optional text field)
//   - Full-width black "Submit Request" action button
//
// Database & Storage flow:
//   1. Inserts row into `public.repair_requests` with status 'pending'
//   2. Uploads photos into `repair-photos/{requestId}/{photoId}.jpg`
//   3. Inserts linked records into `public.repair_photos`
// =============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CustomerStackParamList } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import IconGridSelector, { IconGridOption } from '../../components/IconGridSelector';
import { uploadRepairPhoto } from '../../utils/storage';

type NewRequestNavProp = NativeStackNavigationProp<CustomerStackParamList, 'NewRequest'>;

interface SelectedPhoto {
  uri: string;
  base64: string;
}

// Brand options (circular row per design.md)
const BRAND_OPTIONS: IconGridOption[] = [
  { value: 'Apple', label: 'Apple', icon: 'logo-apple' },
  { value: 'Samsung', label: 'Samsung', icon: 'phone-portrait-outline' },
  { value: 'OnePlus', label: 'OnePlus', icon: 'hardware-chip-outline' },
  { value: 'Xiaomi', label: 'Xiaomi', icon: 'tablet-portrait-outline' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

// Problem type options (square cards, 2-column grid per design.md)
const PROBLEM_OPTIONS: IconGridOption[] = [
  { value: 'Cracked Screen', label: 'Cracked Screen', icon: 'phone-portrait-outline' },
  { value: 'Battery Issue', label: 'Battery Issue', icon: 'battery-dead-outline' },
  { value: 'Water Damage', label: 'Water Damage', icon: 'water-outline' },
  { value: 'Speaker Problem', label: 'Speaker Problem', icon: 'volume-mute-outline' },
  { value: 'Charging Port', label: 'Charging Port', icon: 'flash-outline' },
  { value: 'other', label: 'Other', icon: 'help-circle-outline' },
];

export default function NewRequestScreen() {
  const navigation = useNavigation<NewRequestNavProp>();
  const { user } = useAuth();

  // Step 1: Brand & Model
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [customBrand, setCustomBrand] = useState('');
  const [deviceName, setDeviceName] = useState('');

  // Step 2: Problem Type
  const [selectedProblem, setSelectedProblem] = useState<string | null>(null);
  const [customProblem, setCustomProblem] = useState('');

  // Step 3: Photos (capped at 2)
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);

  // Step 4: Additional Notes
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Handle photo picking from image library or camera.
   */
  const handlePickPhoto = async () => {
    if (photos.length >= 2) {
      Alert.alert('Limit Reached', 'You can upload a maximum of 2 photos.');
      return;
    }

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Needed',
          'Please allow camera roll access to attach photos of the device.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7, // Target ~0.7 quality per photo-upload-flow skill
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (!asset.base64) {
          Alert.alert('Error', 'Could not read photo data. Please try another image.');
          return;
        }

        setPhotos((prev) => [
          ...prev,
          {
            uri: asset.uri,
            base64: asset.base64 as string,
          },
        ]);
      }
    } catch (err: any) {
      Alert.alert('Photo Error', err?.message || 'Failed to select photo.');
    }
  };

  /**
   * Remove a photo from the selection list.
   */
  const handleRemovePhoto = (indexToRemove: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  /**
   * Submit the repair request.
   */
  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Authentication Error', 'Please log in to submit a repair request.');
      return;
    }

    // Determine final brand
    const finalBrand =
      selectedBrand === 'other' ? customBrand.trim() : selectedBrand;
    if (!finalBrand) {
      Alert.alert('Missing Brand', 'Please select a device brand.');
      return;
    }

    // Determine device model
    const trimmedDeviceName = deviceName.trim();
    if (!trimmedDeviceName) {
      Alert.alert('Missing Device Model', 'Please enter your device model (e.g. iPhone 14, Galaxy S23).');
      return;
    }

    // Determine final problem type
    const finalProblem =
      selectedProblem === 'other' ? customProblem.trim() : selectedProblem;
    if (!finalProblem) {
      Alert.alert('Missing Issue', 'Please select the problem type affecting your device.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Insert into `public.repair_requests`
      const { data: requestRow, error: requestError } = await supabase
        .from('repair_requests')
        .insert({
          customer_id: user.id,
          brand: finalBrand,
          device_name: trimmedDeviceName,
          problem_type: finalProblem,
          additional_notes: additionalNotes.trim() || null,
          status: 'pending',
        })
        .select('id')
        .single();

      if (requestError || !requestRow) {
        throw new Error(requestError?.message || 'Failed to create repair request.');
      }

      const requestId = requestRow.id;

      // 2. Upload photos if any were attached
      if (photos.length > 0) {
        for (let i = 0; i < photos.length; i++) {
          await uploadRepairPhoto(requestId, photos[i].base64);
        }
      }

      setIsSubmitting(false);

      // Success confirmation
      Alert.alert(
        'Request Submitted',
        'Your repair request has been submitted successfully! The shop owner will review your request shortly.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err: any) {
      setIsSubmitting(false);
      Alert.alert('Submission Failed', err?.message || 'An unexpected error occurred. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ---- Top Bar ---- */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Mob Dr</Text>
          <View style={styles.topBarSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ---- Heading ---- */}
          <View style={styles.headingSection}>
            <Text style={styles.title}>New Request</Text>
            <Text style={styles.subtitle}>
              Provide details about your device to schedule a doorstep repair.
            </Text>
          </View>

          {/* ---- STEP 1: Brand Selection ---- */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Select Brand</Text>
            <IconGridSelector
              options={BRAND_OPTIONS}
              selectedValue={selectedBrand}
              onSelect={setSelectedBrand}
              otherValue={customBrand}
              onOtherChange={setCustomBrand}
              otherPlaceholder="e.g. Motorola, Google Pixel"
              otherLabel="Custom Brand"
              layout="row"
              cardShape="circle"
              selectedStyle="fill"
            />

            {/* Device Model Input */}
            <View style={styles.deviceModelContainer}>
              <Text style={styles.inputLabel}>Device Model</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. iPhone 14 Pro, Galaxy S23, OnePlus 11"
                placeholderTextColor="#BBBBBB"
                value={deviceName}
                onChangeText={setDeviceName}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* ---- STEP 2: Issue Selection ---- */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Select Issue</Text>
            <IconGridSelector
              options={PROBLEM_OPTIONS}
              selectedValue={selectedProblem}
              onSelect={setSelectedProblem}
              otherValue={customProblem}
              onOtherChange={setCustomProblem}
              otherPlaceholder="Describe your device issue"
              otherLabel="Custom Issue Description"
              layout="grid"
              columns={2}
              cardShape="square"
              selectedStyle="border"
            />
          </View>

          {/* ---- STEP 3: Photo Upload ---- */}
          <View style={styles.section}>
            <View style={styles.photoSectionHeader}>
              <Text style={styles.sectionTitle}>3. Photos (Optional)</Text>
              <Text style={styles.photoCountBadge}>{photos.length}/2</Text>
            </View>
            <Text style={styles.photoInstruction}>
              Photos of the damaged area help the technician bring the right parts.
            </Text>

            {/* Upload Area Button (if under limit) */}
            {photos.length < 2 && (
              <TouchableOpacity
                style={styles.uploadBox}
                onPress={handlePickPhoto}
                activeOpacity={0.7}
              >
                <Ionicons name="camera-outline" size={32} color="#000000" />
                <Text style={styles.uploadBoxText}>Add Photo</Text>
                <Text style={styles.uploadBoxSubtext}>Tap to pick from gallery</Text>
              </TouchableOpacity>
            )}

            {/* Photo Thumbnails */}
            {photos.length > 0 && (
              <View style={styles.thumbnailsContainer}>
                {photos.map((item, index) => (
                  <View key={index} style={styles.thumbnailWrapper}>
                    <Image source={{ uri: item.uri }} style={styles.thumbnailImage} />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => handleRemovePhoto(index)}
                      accessibilityLabel="Remove photo"
                      activeOpacity={0.8}
                    >
                      <Ionicons name="close" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* ---- STEP 4: Additional Notes ---- */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Additional Notes</Text>
            <Text style={styles.inputLabel}>Notes (Optional)</Text>
            <TextInput
              style={styles.multilineInput}
              placeholder="Anything else we should know?"
              placeholderTextColor="#BBBBBB"
              value={additionalNotes}
              onChangeText={setAdditionalNotes}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* ---- Submit Button ---- */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Request</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  flexOne: {
    flex: 1,
  },

  // Top Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  backButton: {
    padding: 6,
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.5,
  },
  topBarSpacer: {
    width: 36,
  },

  // Content
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
  },

  // Heading
  headingSection: {
    marginBottom: 28,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#8A8A8A',
    lineHeight: 21,
  },

  // Sections
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 14,
  },

  // Device Model & Inputs
  deviceModelContainer: {
    marginTop: 18,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8A8A8A',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  input: {
    fontSize: 16,
    color: '#000000',
    paddingVertical: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: '#E0E0E0',
  },
  multilineInput: {
    fontSize: 16,
    color: '#000000',
    paddingVertical: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: '#E0E0E0',
    minHeight: 60,
    textAlignVertical: 'top',
  },

  // Photo Section
  photoSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoCountBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8A8A8A',
  },
  photoInstruction: {
    fontSize: 13,
    color: '#8A8A8A',
    marginBottom: 14,
    marginTop: -8,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderColor: '#000000',
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
    marginBottom: 16,
  },
  uploadBoxText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    marginTop: 8,
  },
  uploadBoxSubtext: {
    fontSize: 12,
    color: '#8A8A8A',
    marginTop: 2,
  },
  thumbnailsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  thumbnailWrapper: {
    position: 'relative',
    width: 90,
    height: 90,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#000000',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Submit Button
  submitButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
