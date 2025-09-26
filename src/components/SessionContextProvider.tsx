"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { showError } from '@/utils/toast';

interface SessionContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        setSession(currentSession);
        setUser(currentSession?.user || null);
        // Redirect authenticated users away from login page
        if (window.location.pathname === '/auth') {
          navigate('/events');
        }
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        // Redirect unauthenticated users to login page
        if (window.location.pathname !== '/auth') {
          navigate('/auth');
        }
      } else if (event === 'INITIAL_SESSION') {
        setSession(currentSession);
        setUser(currentSession?.user || null);
      } else if ((event as any) === 'AUTH_ERROR') { // Fixed: Cast event to any for AUTH_ERROR comparison
        showError('Erro de autenticação: ' + (currentSession as any)?.error?.message || 'Erro desconhecido');
      }
      setIsLoading(false);
    });

    // Fetch initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user || null);
      setIsLoading(false);
      if (!initialSession && window.location.pathname !== '/auth') {
        navigate('/auth');
      } else if (initialSession && window.location.pathname === '/auth') {
        navigate('/events');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <SessionContext.Provider value={{ session, user, isLoading }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionContextProvider');
  }
  return context;
};