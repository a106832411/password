'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { SupabaseClient } from '@supabase/supabase-js';
import { clearUserLocalStorage } from '@/lib/utils/clear-local-storage';
import { getTokenFromStorage, getCurrentUser, removeTokenFromStorage, type UserInfo } from '@/lib/auth/jwt';

// Custom session type that includes our JWT token
type CustomSession = {
  token: any;
  access_token: string;
  token_type: string;
  user: UserInfo;
};

type AuthContextType = {
  supabase: SupabaseClient;
  session: CustomSession | null;
  user: UserInfo | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const supabase = createClient();
  const [session, setSession] = useState<CustomSession | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from JWT token in localStorage
  useEffect(() => {
    const loadUser = () => {
      const token = getTokenFromStorage();
      const currentUser = getCurrentUser();

      if (token && currentUser) {
        setSession({
          access_token: token,
          token_type: 'bearer',
          user: currentUser,
        });
        setUser(currentUser);
      } else {
        setSession(null);
        setUser(null);
      }
      setIsLoading(false);
    };

    loadUser();

    // Listen for storage changes (login/logout in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token') {
        loadUser();
      }
    };

    // Also listen for custom auth-update event (same tab updates)
    const handleAuthUpdate = () => {
      loadUser();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth-update', handleAuthUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-update', handleAuthUpdate);
    };
  }, []);

  const signOut = async () => {
    removeTokenFromStorage();
    clearUserLocalStorage();
    setSession(null);
    setUser(null);
  };

  const value = {
    supabase,
    session,
    user,
    isLoading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
