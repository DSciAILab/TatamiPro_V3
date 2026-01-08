"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { db } from '@/lib/local-db';
import { connectionManager } from '@/lib/connection-manager';
import { showError } from '@/utils/toast';
import {
  StaffAccessToken,
  StaffSession,
  ConnectedClient,
  GenerateTokenRequest,
  StaffAccessLink,
  generateTokenString,
  buildStaffAccessUrl,
} from '@/types/staff-access';

interface StaffContextType {
  // Auth state from hook
  isLoading: boolean;
  isAuthenticated: boolean;
  session: StaffSession | null;
  token: StaffAccessToken | null;
  error: string | null;

  // Auth actions
  authenticate: (tokenString: string, eventId: string) => Promise<any>;
  logout: () => Promise<void>;
  checkPermission: (module: string) => boolean;

  // Token management (for admins/organizers)
  generateToken: (request: GenerateTokenRequest) => Promise<StaffAccessLink>;
  revokeToken: (tokenId: string) => Promise<void>;
  getEventTokens: (eventId: string) => Promise<StaffAccessToken[]>;
  
  // Connected clients (for master mode)
  connectedClients: ConnectedClient[];
  refreshConnectedClients: () => Promise<void>;
}

const StaffContext = createContext<StaffContextType | undefined>(undefined);

interface StaffProviderProps {
  children: ReactNode;
  eventId?: string;
}

export const StaffProvider: React.FC<StaffProviderProps> = ({ children, eventId }) => {
  const auth = useStaffAuth();
  const [connectedClients, setConnectedClients] = useState<ConnectedClient[]>([]);

  // Listen for client connections via WebSocket
  useEffect(() => {
    const socket = connectionManager.socket;
    if (!socket) return;

    const handleClientConnected = (data: any) => {
      setConnectedClients(prev => {
        const existing = prev.find(c => c.session_id === data.session_id);
        if (existing) {
          return prev.map(c => 
            c.session_id === data.session_id 
              ? { ...c, is_online: true, last_activity_at: new Date() }
              : c
          );
        }
        return [...prev, {
          session_id: data.session_id,
          token_id: data.token_id,
          nickname: data.nickname,
          role: data.role,
          connected_at: new Date(),
          last_activity_at: new Date(),
          is_online: true,
          device_info: data.device_info,
        }];
      });
    };

    const handleClientDisconnected = (data: any) => {
      setConnectedClients(prev =>
        prev.map(c =>
          c.session_id === data.session_id
            ? { ...c, is_online: false }
            : c
        )
      );
    };

    socket.on('staff:client:connected', handleClientConnected);
    socket.on('staff:client:disconnected', handleClientDisconnected);

    return () => {
      socket.off('staff:client:connected', handleClientConnected);
      socket.off('staff:client:disconnected', handleClientDisconnected);
    };
  }, []);

  /**
   * Generate a new access token
   */
  const generateToken = useCallback(async (request: GenerateTokenRequest): Promise<StaffAccessLink> => {
    const token: StaffAccessToken = {
      id: crypto.randomUUID(),
      event_id: request.event_id,
      role: request.role,
      token: generateTokenString(),
      nickname: request.nickname,
      created_at: new Date(),
      expires_at: request.expires_at,
      status: 'active',
      max_uses: request.max_uses,
      current_uses: 0,
    };

    // Save to local DB
    await db.staffTokens.put(token);

    // Save to Supabase (Cloud Persistence)
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase.from('sjjp_staff_tokens').insert({
        id: token.id,
        event_id: token.event_id,
        token: token.token,
        role: token.role,
        nickname: token.nickname,
        status: token.status,
        max_uses: token.max_uses,
        current_uses: token.current_uses,
        created_at: token.created_at.toISOString(),
        expires_at: token.expires_at?.toISOString(),
      });
      if (error) {
        console.error('[StaffContext] Failed to sync token to Supabase:', error);
        showError('Erro ao sincronizar token com a nuvem v2. Verifique se a tabela sjjp_staff_tokens existe.');
      }
    } catch (err) {
      console.error('[StaffContext] Supabase sync error:', err);
    }

    // If connected to server, sync
    if (connectionManager.isLocal && connectionManager.socket?.connected) {
      connectionManager.socket.emit('staff:token:created', token);
    }

    // Build URL
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : 'http://localhost:5173';
    
    const url = buildStaffAccessUrl(baseUrl, request.event_id, token.token, request.role);

    return {
      token,
      url,
      qr_data: url,
    };
  }, []);

  /**
   * Revoke a token
   */
  const revokeToken = useCallback(async (tokenId: string) => {
    await db.staffTokens.update(tokenId, { status: 'revoked' });

    // Sync revocation to Supabase
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      await supabase
        .from('sjjp_staff_tokens')
        .update({ status: 'revoked' })
        .eq('id', tokenId);
    } catch (err) {
      console.error('[StaffContext] Failed to sync revocation to Supabase:', err);
    }

    // If connected, notify server
    if (connectionManager.isLocal && connectionManager.socket?.connected) {
      connectionManager.socket.emit('staff:token:revoked', { token_id: tokenId });
    }

    // Disconnect any active sessions using this token
    const sessions = await db.activeSessions.where('token_id').equals(tokenId).toArray();
    for (const session of sessions) {
      await db.activeSessions.update(session.id, { is_online: false });
      if (connectionManager.socket?.connected) {
        connectionManager.socket.emit('staff:session:terminate', { session_id: session.id });
      }
    }
  }, []);

  /**
   * Get all tokens for an event
   */
  const getEventTokens = useCallback(async (eventId: string): Promise<StaffAccessToken[]> => {
    return db.getEventTokens(eventId);
  }, []);

  /**
   * Refresh connected clients list
   */
  const refreshConnectedClients = useCallback(async () => {
    if (!eventId) return;

    try {
      // Get from local DB first
      const sessions = await db.activeSessions
        .where('event_id')
        .equals(eventId)
        .and(s => s.is_online)
        .toArray();

      const clients: ConnectedClient[] = await Promise.all(
        sessions.map(async (session) => {
          const token = await db.staffTokens.get(session.token_id);
          return {
            session_id: session.id,
            token_id: session.token_id,
            nickname: token?.nickname,
            role: session.role,
            connected_at: session.connected_at,
            last_activity_at: session.last_activity_at,
            is_online: session.is_online,
            device_info: session.device_info,
          };
        })
      );

      setConnectedClients(clients);

      // If connected to local server, request fresh data
      if (connectionManager.isLocal && connectionManager.socket?.connected) {
        connectionManager.socket.emit('staff:clients:request', { event_id: eventId });
      }
    } catch (err) {
      console.error('[StaffContext] Error refreshing clients:', err);
    }
  }, [eventId]);

  // Refresh clients periodically if in master mode
  useEffect(() => {
    if (!eventId) return;

    refreshConnectedClients();

    const interval = setInterval(refreshConnectedClients, 10000);
    return () => clearInterval(interval);
  }, [eventId, refreshConnectedClients]);

  const value: StaffContextType = {
    // Auth
    isLoading: auth.isLoading,
    isAuthenticated: auth.isAuthenticated,
    session: auth.session,
    token: auth.token,
    error: auth.error,
    authenticate: auth.authenticate,
    logout: auth.logout,
    checkPermission: auth.checkPermission,

    // Token management
    generateToken,
    revokeToken,
    getEventTokens,

    // Connected clients
    connectedClients,
    refreshConnectedClients,
  };

  return (
    <StaffContext.Provider value={value}>
      {children}
    </StaffContext.Provider>
  );
};

export const useStaff = (): StaffContextType => {
  const context = useContext(StaffContext);
  if (context === undefined) {
    throw new Error('useStaff must be used within a StaffProvider');
  }
  return context;
};

export default StaffContext;
