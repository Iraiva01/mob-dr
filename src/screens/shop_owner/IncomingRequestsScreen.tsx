// =============================================================================
// Incoming Requests Screen (Placeholder)
// =============================================================================
// Top screen for the ShopOwnerStack.
// Shows a placeholder for incoming customer repair requests, confirms shop owner role,
// and includes a Sign Out button to test switching roles.
//
// Follows the `new-screen-design` skill (Uber-inspired minimal black and white).
// =============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

export default function IncomingRequestsScreen() {
  const { user, session, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Wordmark & Role Badge */}
        <View style={styles.header}>
          <Text style={styles.logoText}>Mob Dr</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>SHOP OWNER</Text>
          </View>
        </View>

        {/* Heading & Subtitle */}
        <Text style={styles.title}>Incoming Requests</Text>
        <Text style={styles.subtitle}>
          Review incoming doorstep repair requests and customer details.
        </Text>

        {/* Placeholder Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Shop Owner Console</Text>
          <Text style={styles.cardBody}>
            Logged in as{' '}
            <Text style={styles.boldText}>
              {user?.email || session?.user?.email || 'Shop Owner'}
            </Text>
          </Text>
          {user?.phone_number ? (
            <Text style={styles.cardBody}>
              Phone: <Text style={styles.boldText}>{user.phone_number}</Text>
            </Text>
          ) : null}
          <View style={styles.divider} />
          <Text style={styles.infoSubtext}>
            ShopOwnerStack is active. In the next step, we will build out the incoming request
            cards, accept/reject review flows, and revenue stats dashboard.
          </Text>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={[styles.signOutButton, isSigningOut && styles.buttonDisabled]}
          onPress={handleSignOut}
          disabled={isSigningOut}
          activeOpacity={0.8}
        >
          {isSigningOut ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -1,
  },
  roleBadge: {
    backgroundColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8A8A8A',
    marginBottom: 32,
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 36,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8A8A8A',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  cardBody: {
    fontSize: 15,
    color: '#333333',
    marginBottom: 6,
  },
  boldText: {
    fontWeight: '700',
    color: '#000000',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 14,
  },
  infoSubtext: {
    fontSize: 13,
    color: '#777777',
    lineHeight: 19,
  },
  signOutButton: {
    borderWidth: 1.5,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signOutButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
});
