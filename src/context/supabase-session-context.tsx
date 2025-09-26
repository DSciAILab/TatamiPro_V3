"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface SupabaseSessionContextType {
  session: Session | null;
  isLoading: boolean;
}

const SupabaseSessionContext = createContext<SupabaseSessionContextType | undefined>(undefined);

export const SupabaseSessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsLoading(false);
      if (_event === 'SIGNED_OUT') {
        navigate('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <SupabaseSessionContext.Provider value={{ session, isLoading }}>
      {children}
    </SupabaseSessionContext.Provider>
  );
};

export const useSupabaseSession = () => {
  const context = useContext(SupabaseSessionContext);
  if (context === undefined) {
    throw new Error('useSupabaseSession must be used within a SupabaseSessionProvider');
  }
  return context;
};