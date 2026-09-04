// =============================================================================
// Social Auth Button Component
// =============================================================================
// Uber-inspired circular social sign-in buttons for Google and Apple.
// Design specification (from design.md):
//   "two circular icon buttons for Google and Apple sign-in,
//    white background with black border, centered horizontally."
// =============================================================================

import React from 'react';
import { TouchableOpacity, StyleSheet, Alert, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SocialAuthButtonProps {
  provider: 'google' | 'apple';
  onPress?: () => void;
}

export default function SocialAuthButton({ provider, onPress }: SocialAuthButtonProps) {
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      Alert.alert(
        'Coming Soon',
        `${provider === 'google' ? 'Google' : 'Apple'} Sign-In will be configured in an upcoming update.`
      );
    }
  };

  const iconName = provider === 'google' ? 'logo-google' : 'logo-apple';

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityLabel={`Sign in with ${provider === 'google' ? 'Google' : 'Apple'}`}
      accessibilityRole="button"
    >
      <Ionicons name={iconName} size={22} color="#000000" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
    // Subtle shadow matching Uber-style design
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
});
