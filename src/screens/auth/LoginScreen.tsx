// =============================================================================
// Login Screen
// =============================================================================
// Uber-inspired minimal login with Phone Number or Email + Password.
// Uses Supabase Auth for authentication.
//
// Design specification (from design.md & new-screen-design skill):
//   - Pure white background (#FFFFFF), black accents (#000000)
//   - App wordmark "Mob Dr" in bold black text with generous top spacing
//   - Large heading "Welcome" in bold black, subtext in gray (#8A8A8A)
//   - Two input fields stacked vertically with black underline style (no boxes)
//   - Full-width black "Log In" button with white text and subtle shadow
//   - Small centered text "Don't have an account? Sign up"
//   - Subtle divider line with "Or continue with"
//   - Two circular icon buttons for Google and Apple sign-in (white bg, black border)
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
import SocialAuthButton from '../../components/auth/SocialAuthButton';

type LoginNavProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<LoginNavProp>();

  // Form state
  const [identifier, setIdentifier] = useState(''); // phone number or email
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Handle user login.
   * Supports logging in with either an Email address or a Phone number.
   * If a phone number is entered, it resolves the associated email via
   * the get_email_for_phone RPC and then authenticates via Supabase Auth.
   */
  const handleLogin = async () => {
    const trimmedIdentifier = identifier.trim();

    if (!trimmedIdentifier || !password) {
      Alert.alert('Missing Fields', 'Please enter your phone number or email, and password.');
      return;
    }

    setIsLoading(true);

    try {
      let emailToAuth = trimmedIdentifier;

      // Check if input is a phone number (does not contain '@')
      const isEmail = trimmedIdentifier.includes('@');
      if (!isEmail) {
        // Look up associated email by phone number using our database RPC
        const { data: resolvedEmail, error: rpcError } = await supabase.rpc(
          'get_email_for_phone',
          { p_phone: trimmedIdentifier }
        );

        if (rpcError || !resolvedEmail) {
          setIsLoading(false);
          Alert.alert(
            'Account Not Found',
            'No account was found with that phone number. Please check the number or sign up for a new account.'
          );
          return;
        }

        emailToAuth = resolvedEmail;
      }

      // Authenticate via Supabase Auth
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: emailToAuth,
        password,
      });

      if (signInError) {
        Alert.alert('Login Failed', signInError.message);
      }
      // On success, AuthContext listener automatically catches the new session.
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'An unexpected error occurred. Please try again.');
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
        <Text style={styles.heading}>Welcome</Text>
        <Text style={styles.subheading}>Sign in to your account</Text>

        {/* ---- Phone Number or Email input ---- */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Phone Number or Email</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. +91 98765 43210 or name@email.com"
            placeholderTextColor="#BBBBBB"
            value={identifier}
            onChangeText={setIdentifier}
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
            placeholder="Enter your password"
            placeholderTextColor="#BBBBBB"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isLoading}
          />
        </View>

        {/* ---- Login button ---- */}
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Log In</Text>
          )}
        </TouchableOpacity>

        {/* ---- Navigate to signup ---- */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            disabled={isLoading}
          >
            <Text style={styles.footerLink}>Sign up</Text>
          </TouchableOpacity>
        </View>

        {/* ---- Divider ---- */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* ---- Social Auth Buttons ---- */}
        <View style={styles.socialButtonsContainer}>
          <SocialAuthButton provider="google" />
          <SocialAuthButton provider="apple" />
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
    paddingTop: 64,
    paddingBottom: 36,
  },

  // Wordmark
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
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
    marginBottom: 32,
  },

  // Input fields — underline style
  inputGroup: {
    marginBottom: 24,
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

  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#EEEEEE',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: '#8A8A8A',
  },

  // Social Sign-In
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
