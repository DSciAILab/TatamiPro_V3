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
  username: string | null;
  phone: string | null;
  prefers_wide_layout?: boolean; // Added this line
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  updateProfile: (updates: Partial<Profile>) => Promise<void>; // Added this line
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    console.log('[AUTHCONTEXT] Fetching profile for user:', userId);
    
    try {
      // Add timeout to prevent hanging
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
      );
      
      const fetchPromise = supabase
        .from('sjjp_profiles')
        .select('first_name, last_name, role, club, avatar_url, username, phone, must_change_password')
        .eq('id', userId)
        .maybeSingle(); // Use maybeSingle instead of single to avoid error on no rows
      
      const { data, error } = await Promise.race([fetchPromise, timeout]) as any;
      
      console.log('[AUTHCONTEXT] Profile fetch result:', { data, error, hasData: !!data });
      
      if (error) {
        console.error('[AUTHCONTEXT] Error fetching profile:', error);
        setProfile(null);
      } else if (data) {
        console.log('[AUTHCONTEXT] Profile set successfully:', data.first_name, data.last_name);
        setProfile(data);
      } else {
        console.warn('[AUTHCONTEXT] No profile found for user, creating default...');
        // Profile doesn't exist - set minimal profile to unblock UI
        setProfile({
          first_name: 'Usuário',
          last_name: '',
          role: 'admin',
          club: null,
          avatar_url: null,
          username: null,
          phone: null,
        });
      }
    } catch (err) {
      console.error('[AUTHCONTEXT] Profile fetch failed:', err);
      // Set a default profile to unblock the UI
      setProfile({
        first_name: 'Usuário',
        last_name: '',
        role: 'admin',
        club: null,
        avatar_url: null,
        username: null,
        phone: null,
      });
    }
  }, []);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('sjjp_profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating profile:", error);
    } else {
      setProfile(data); // Optimistically update local state
    }
  };

  useEffect(() => {
    const fetchSessionAndProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch (error) {
        console.error('[AUTHCONTEXT] Initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessionAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        if (_event !== 'USER_UPDATED') {
          setLoading(true);
          await fetchProfile(session.user.id);
          setLoading(false);
        }
      } else {
        setProfile(null);
      }
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
    updateProfile, // Expose the update function
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};