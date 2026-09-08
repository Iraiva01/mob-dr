// =============================================================================
// Register Screen
// =============================================================================
// Uber-inspired signup with Full Name, Phone Number, Email, and Password.
//
// Uses Supabase Auth for account creation. On signup:
//   - Passes `role: 'customer'`, `full_name`, and `phone_number` in `options.data`.
//   - The `on_auth_user_created` database trigger writes the profile row into
//     the `public.users` table with role = 'customer'.
//   - An authenticated session is established immediately.
//
// Design specification (from design.md & new-screen-design skill):
//   - Pure white background (#FFFFFF), black accents (#000000)
//   - Heading "Create Account" in bold black
//   - Stacked underline-style inputs: Full Name, Phone Number, Email, Password
//   - All new signups default to Customer role (Shop Owner is pre-seeded)
//   - Full-width black "Create Account" button with white text and subtle shadow
//   - Footer: "Already have an account? Log in"
// =============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import { AuthStackParamList } from '../../types';

type RegisterNavProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export default function RegisterScreen() {
  const navigation = useNavigation<RegisterNavProp>();

  // Form state
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Handle user signup.
   * Creates an account in Supabase Auth and passes user metadata.
   */
  const handleSignup = async () => {
    const trimmedName = fullName.trim();
    const trimmedPhone = phoneNumber.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedPhone || !trimmedEmail || !password) {
      Alert.alert('Missing Fields', 'Please fill in all fields to create your account.');
      return;
    }

    // Basic email format check
    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    // Password length validation
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            full_name: trimmedName,
            phone_number: trimmedPhone,
            role: 'customer',
          },
        },
      });

      if (error) {
        Alert.alert('Signup Failed', error.message);
        return;
      }

      // If a session was created immediately, AuthContext will update automatically.
      // If for any reason confirmation was needed, inform the user:
      if (!data.session) {
        Alert.alert(
          'Account Created',
          'Your account has been created. Please log in to continue.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'An unexpected error occurred during signup.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ---- Wordmark ---- */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Mob Dr</Text>
        </View>

        {/* ---- Heading & Subtitle ---- */}
        <Text style={styles.heading}>Create Account</Text>
        <Text style={styles.subheading}>Join Mob Dr to get started</Text>

        {/* ---- Full Name input ---- */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Rahul Sharma"
            placeholderTextColor="#BBBBBB"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            editable={!isLoading}
          />
        </View>

        {/* ---- Phone Number input ---- */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. +91 98765 43210"
            placeholderTextColor="#BBBBBB"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            editable={!isLoading}
          />
        </View>

        {/* ---- Email input ---- */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. rahul@example.com"
            placeholderTextColor="#BBBBBB"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
          />
        </View>

        {/* ---- Password input ---- */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Minimum 6 characters"
            placeholderTextColor="#BBBBBB"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isLoading}
          />
        </View>

        {/* ---- Signup button ---- */}
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        {/* ---- Navigate to login ---- */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            disabled={isLoading}
          >
            <Text style={styles.footerLink}>Log in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// =============================================================================
// Styles — Uber-inspired minimal: white bg (#FFFFFF), black accents (#000000)
// =============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 56,
    paddingBottom: 40,
  },

  // Wordmark
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoText: {
    fontSize: 34,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -1,
  },

  // Heading & Subtitle
  heading: {
    fontSize: 30,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 6,
  },
  subheading: {
    fontSize: 16,
    color: '#8A8A8A',
    marginBottom: 28,
  },

  // Input fields — underline style (no boxes, minimal look)
  inputGroup: {
    marginBottom: 22,
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
    paddingVertical: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: '#E0E0E0',
  },
  // Primary action button — full-width black pill
  button: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#8A8A8A',
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
});
