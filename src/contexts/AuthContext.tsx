// =============================================================================
// Auth Context
// =============================================================================
// Provides app-wide authentication state via React Context.
//
// Responsibilities:
// 1. Listen to Supabase auth state changes (login, logout, token refresh).
// 2. When a user logs in, fetch their profile from the `users` table to get
//    their role (customer vs shop_owner).
// 3. Expose the current user, their role, and loading state to any component
//    via the useAuth() hook.
//
// How role-based routing works:
// - AppNavigator reads `user` and `userRole` from this context.
// - If user is null → show AuthNavigator (Login/Register).
// - If userRole is 'customer' → show CustomerNavigator.
// - If userRole is 'shop_owner' → show ShopOwnerNavigator.
// =============================================================================

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import { User, UserRole } from '../types';

/** Shape of the auth context value */
interface AuthContextType {
  /** The current Supabase auth session (null if logged out) */
  session: Session | null;

  /** The user's profile from the `users` table (null if not loaded or logged out) */
  user: User | null;

  /** The user's role — drives which navigator stack is shown */
  userRole: UserRole | null;

  /** True while the initial auth check is in progress (show a loading screen) */
  isLoading: boolean;

  /** Sign out the current user and clear all state */
  signOut: () => Promise<void>;
}

// Create the context with a default value that will never actually be used
// (the provider always wraps the app), but TypeScript needs it.
const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  userRole: null,
  isLoading: true,
  signOut: async () => {},
});

/**
 * Hook to access auth state from any component.
 * Usage: const { user, userRole, isLoading, signOut } = useAuth();
 */
export const useAuth = () => useContext(AuthContext);

/**
 * Provider component — wrap this around the entire app (in App.tsx).
 * It listens to Supabase auth changes and keeps user/role state in sync.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetch the user's profile (including role) from the `users` table.
   * Called whenever a new session is detected.
   * Includes retry logic in case a fresh signup trigger takes a few milliseconds.
   */
  const fetchUserProfile = async (userId: string, retries = 2) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        if (retries > 0) {
          setTimeout(() => fetchUserProfile(userId, retries - 1), 500);
          return;
        }
        console.error('Error fetching user profile:', error?.message);
        return;
      }

      setUser(data as User);
      setUserRole(data.role as UserRole);
    } catch (err) {
      console.error('Unexpected error fetching user profile:', err);
    }
  };

  useEffect(() => {
    // 1. Check for an existing session on app launch
    //    (e.g., user was logged in previously and session is persisted in AsyncStorage).
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession?.user) {
        fetchUserProfile(currentSession.user.id);
      }
      setIsLoading(false);
    });

    // 2. Subscribe to future auth state changes (login, logout, token refresh).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        if (newSession?.user) {
          await fetchUserProfile(newSession.user.id);
        } else {
          // User logged out — clear everything
          setUser(null);
          setUserRole(null);
        }
      }
    );

    // 3. Cleanup: unsubscribe when the component unmounts (shouldn't happen
    //    since AuthProvider wraps the whole app, but good practice).
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /** Sign out: clear Supabase session and reset local state. */
  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, userRole, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
