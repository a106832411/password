'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { SupabaseClient } from '@supabase/supabase-js';
import { clearUserLocalStorage } from '@/lib/utils/clear-local-storage';

const STATIC_ACCESS_TOKEN =
  'eyJhbGciOiJIUzI1NiIsImtpZCI6IlJndGI5enVNdm9QMXIybVEiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2Rja3d2aWZvZG13aWNlbXNqdmViLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIzMjY0OTg2YS1mYjhiLTQwNDQtOWVlNC0yODFiNTcwY2U1ZTgiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzY3NzUwMjM2LCJpYXQiOjE3Njc3NDY2MzYsImVtYWlsIjoiNDk4MjAwMDNAcXEuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbCI6IjQ5ODIwMDAzQHFxLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInN1YiI6IjMyNjQ5ODZhLWZiOGItNDA0NC05ZWU0LTI4MWI1NzBjZTVlOCIsInRlcm1zX2FjY2VwdGVkX2F0IjoiMjAyNS0xMi0yNlQwMzo1OToyNC42MDRaIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoibWFnaWNsaW5rIiwidGltZXN0YW1wIjoxNzY3NzQ2NjM2fV0sInNlc3Npb25faWQiOiI3ZDY3MmRkNS04YWNlLTQ5ZDAtOTNjNC02MGIxZWM1NGEyZmUiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.m19IFMME3AdPvwAzFDLsd5QdSFeEVFo7ShX8Xy0vtbw';

const staticUser: User = {
  id: 'static-user-id',
  aud: 'authenticated',
  app_metadata: {},
  user_metadata: {},
  created_at: new Date().toISOString(),
  email: 'static-user@example.com',
  role: 'authenticated',
  last_sign_in_at: new Date().toISOString(),
};

const staticSession: Session = {
  access_token: STATIC_ACCESS_TOKEN,
  refresh_token: 'static-refresh-token',
  expires_in: 24 * 60 * 60,
  token_type: 'bearer',
  user: staticUser,
};

type AuthContextType = {
  supabase: SupabaseClient;
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const supabase = createClient();
  const [session] = useState<Session | null>(staticSession);
  const [user] = useState<User | null>(staticUser);
  const [isLoading] = useState(false);

  // Ensure the Supabase client actually holds the static session so downstream
  // hooks that fetch access tokens do not fail in no-login mode.
  useEffect(() => {
    const setStaticSession = async () => {
      try {
        await supabase.auth.setSession({
          access_token: STATIC_ACCESS_TOKEN,
          refresh_token: staticSession.refresh_token,
        });
      } catch (error) {
        console.error('Failed to set static Supabase session', error);
      }
    };

    setStaticSession();
  }, [supabase]);

  const signOut = async () => {
    clearUserLocalStorage();
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
