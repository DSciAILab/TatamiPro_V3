"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

export interface Profile {
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  role: 'admin' | 'coach' | 'staff' | 'athlete';
  club: string | null;
  username?: string | null;
  phone?: string | null;
  must_change_password?: boolean;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string, retries = 1, delay = 300) => {
    for (let i = 0; i < retries; i++) {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, role, club, avatar_url, username, phone, must_change_password')
        .eq('id', userId)
        .single();
      
      if (data) {
        setProfile(data);
        return; // Success
      }

      if (error && error.code !== 'PGRST116') { // PGRST116: "exact one row not found"
        console.error('Error fetching profile:', error);
        setProfile(null);
        return; // Hard error, stop retrying
      }

      // If row not found, wait and retry
      if (i < retries - 1) await new Promise(res => setTimeout(res, delay));
    }
    console.error('Profile not found after retries.');
    setProfile(null);
  }, []);

  useEffect(() => {
    const fetchSessionAndProfile = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    };

    fetchSessionAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setLoading(true);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // On first sign-in, the profile might not be created yet. Retry fetching.
        const retryCount = event === 'SIGNED_IN' ? 5 : 1;
        await fetchProfile(session.user.id, retryCount);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const value = {
    session,
    user,
    profile,
    loading,
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