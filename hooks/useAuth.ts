import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';

export interface UseAuthReturn {
  session: any;
  isAuthChecking: boolean;
  signOut: () => Promise<void>;
}

/**
 * Hook for Supabase authentication state management.
 * Handles session initialization, auth state changes, and sign out.
 */
export function useAuth(): UseAuthReturn {
  const [session, setSession] = useState<any>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsAuthChecking(false);
      return;
    }

    const initializeAuth = async () => {
      setIsAuthChecking(true);
      try {
        const { data: { session: currentSession }, error } = await supabase!.auth.getSession();
        if (error) {
          console.error('[Auth] Failed to get session:', error);
          setSession(null);
        } else {
          setSession(currentSession);
        }
      } catch (err) {
        console.error('[Auth] Auth initialization error:', err);
        setSession(null);
      } finally {
        setIsAuthChecking(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase!.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
  };

  return { session, isAuthChecking, signOut };
}
