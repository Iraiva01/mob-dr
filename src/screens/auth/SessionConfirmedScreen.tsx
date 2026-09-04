// =============================================================================
// Session Confirmed Screen
// =============================================================================
// Displayed when a user has an active authenticated session.
// Confirms that Supabase Auth works properly, user data and role are loaded from
// the `users` table, without navigating to the customer or shop owner stacks yet
// (per project instructions: "Do not build any post-login navigation yet — just get
// auth working and confirm a user session is created.").
//
// Uses the Uber-inspired minimal black-and-white design language from
// `new-screen-design` skill.
// =============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

export default function SessionConfirmedScreen() {
  const { user, userRole, session, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  const formattedRole =
    userRole === 'shop_owner' ? 'Shop Owner' : userRole === 'customer' ? 'Customer' : 'Loading...';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ---- Wordmark ---- */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Mob Dr</Text>
        </View>

        {/* ---- Status Pill Badge ---- */}
        <View style={styles.badgeContainer}>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusBadgeText}>SESSION ACTIVE</Text>
          </View>
        </View>

        {/* ---- Heading ---- */}
        <Text style={styles.heading}>Authenticated</Text>
        <Text style={styles.subheading}>
          User session is established via Supabase Auth.
        </Text>

        {/* ---- Session Details Card ---- */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account Profile</Text>

          {/* Role Row */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Assigned Role</Text>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>{formattedRole}</Text>
            </View>
          </View>

          {/* Email Row */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {user?.email || session?.user?.email || 'N/A'}
            </Text>
          </View>

          {/* Phone Number Row */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Phone Number</Text>
            <Text style={styles.detailValue}>
              {user?.phone_number || session?.user?.user_metadata?.phone_number || 'None'}
            </Text>
          </View>

          {/* User ID Row */}
          <View style={[styles.detailRow, styles.lastRow]}>
            <Text style={styles.detailLabel}>User ID</Text>
            <Text style={styles.detailValueSmall} numberOfLines={1} ellipsizeMode="middle">
              {user?.id || session?.user?.id || 'N/A'}
            </Text>
          </View>
        </View>

        {/* ---- Info Note ---- */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            ✓ Stored in database table <Text style={styles.boldText}>public.users</Text>.
            Post-login navigation stacks will be integrated in the next milestone.
          </Text>
        </View>

        {/* ---- Sign Out Button ---- */}
        <TouchableOpacity
          style={[styles.button, isSigningOut && styles.buttonDisabled]}
          onPress={handleSignOut}
          disabled={isSigningOut}
          activeOpacity={0.8}
        >
          {isSigningOut ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Sign Out</Text>
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

  // Wordmark
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -1,
  },

  // Status Badge (Uber-style black pill)
  badgeContainer: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginRight: 6,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },

  // Heading & Subheading
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 6,
  },
  subheading: {
    fontSize: 15,
    color: '#8A8A8A',
    marginBottom: 28,
    lineHeight: 22,
  },

  // Card with subtle shadow
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    // Subtle drop shadow matching new-screen-design rules
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8A8A8A',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 16,
  },
  detailRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F4',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastRow: {
    borderBottomWidth: 0,
    paddingBottom: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#8A8A8A',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    maxWidth: '60%',
    textAlign: 'right',
  },
  detailValueSmall: {
    fontSize: 13,
    fontWeight: '500',
    color: '#000000',
    maxWidth: '60%',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Role Pill
  rolePill: {
    backgroundColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rolePillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Info Box
  infoBox: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  infoText: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 19,
  },
  boldText: {
    fontWeight: '700',
    color: '#000000',
  },

  // Full-width black button
  button: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
});
