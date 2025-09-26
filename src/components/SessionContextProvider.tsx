"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { showError } from '@/utils/toast';

interface SessionContextType {
  session: Session | null;
  user: User | null;
  userRole: string | null; // Adicionado: papel do usuário
  userClub: string | null; // Adicionado: clube do usuário
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userClub, setUserClub] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('role, club')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Erro ao buscar perfil do usuário:', error.message);
      showError('Erro ao carregar informações do perfil.');
      setUserRole(null);
      setUserClub(null);
      localStorage.removeItem('userRole');
      localStorage.removeItem('userClub');
    } else if (data) {
      setUserRole(data.role);
      setUserClub(data.club);
      localStorage.setItem('userRole', data.role);
      if (data.club) {
        localStorage.setItem('userClub', data.club);
      } else {
        localStorage.removeItem('userClub');
      }
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        setSession(currentSession);
        setUser(currentSession?.user || null);
        if (currentSession?.user) {
          await fetchUserProfile(currentSession.user.id);
        }
        // Redirect authenticated users away from login page
        if (window.location.pathname === '/auth') {
          navigate('/events');
        }
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setUserRole(null);
        setUserClub(null);
        localStorage.removeItem('userRole');
        localStorage.removeItem('userClub');
        // Redirect unauthenticated users to login page
        if (window.location.pathname !== '/auth') {
          navigate('/auth');
        }
      } else if (event === 'INITIAL_SESSION') {
        setSession(currentSession);
        setUser(currentSession?.user || null);
        if (currentSession?.user) {
          await fetchUserProfile(currentSession.user.id);
        }
      } else if ((event as any) === 'AUTH_ERROR') {
        showError('Erro de autenticação: ' + (currentSession as any)?.error?.message || 'Erro desconhecido');
      }
      setIsLoading(false);
    });

    // Fetch initial session and profile
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user || null);
      if (initialSession?.user) {
        await fetchUserProfile(initialSession.user.id);
      }
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
    <SessionContext.Provider value={{ session, user, userRole, userClub, isLoading }}>
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