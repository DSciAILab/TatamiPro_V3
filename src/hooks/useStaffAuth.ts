"use client";

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/local-db';
import { connectionManager } from '@/lib/connection-manager';
import {
  StaffAccessToken,
  StaffSession,
  StaffRole,
  StaffAccessResponse,
  DeviceInfo,
  hasPermission,
} from '@/types/staff-access';

interface UseStaffAuthResult {
  // State
  isLoading: boolean;
  isAuthenticated: boolean;
  session: StaffSession | null;
  token: StaffAccessToken | null;
  error: string | null;

  // Actions
  authenticate: (tokenString: string, eventId: string) => Promise<StaffAccessResponse>;
  logout: () => Promise<void>;
  checkPermission: (module: string) => boolean;
  updateActivity: () => Promise<void>;
}

/**
 * Get device info for session tracking
 */
function getDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined') return {};
  
  return {
    user_agent: navigator.userAgent,
    platform: navigator.platform,
    screen_width: window.screen.width,
    screen_height: window.screen.height,
  };
}

/**
 * Hook for staff authentication via token
 */
export function useStaffAuth(): UseStaffAuthResult {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<StaffSession | null>(null);
  const [token, setToken] = useState<StaffAccessToken | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const storedSessionId = localStorage.getItem('staff_session_id');
        if (!storedSessionId) {
          setIsLoading(false);
          return;
        }

        const existingSession = await db.activeSessions.get(storedSessionId);
        if (existingSession && existingSession.is_online) {
          const existingToken = await db.staffTokens.get(existingSession.token_id);
          if (existingToken && existingToken.status === 'active') {
            setSession(existingSession);
            setToken(existingToken);
          } else {
            // Token invalid, clean up session
            localStorage.removeItem('staff_session_id');
            await db.activeSessions.delete(storedSessionId);
          }
        }
      } catch (err) {
        console.error('[useStaffAuth] Error checking session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingSession();
  }, []);

  /**
   * Authenticate with a token
   */
  const authenticate = useCallback(async (
    tokenString: string,
    eventId: string
  ): Promise<StaffAccessResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      // First, try to validate locally
      let validToken = await db.validateToken(tokenString, eventId);

      // If connection mode allows, also validate with server
      if (!validToken && !connectionManager.isOffline) {
        // Try to fetch token from server/Supabase
        try {
          if (connectionManager.isLocal) {
            const response = await fetch(
              `${connectionManager.localServerUrl}/api/staff/validate`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: tokenString, event_id: eventId }),
              }
            );
            if (response.ok) {
              const data = await response.json();
              if (data.token) {
                // Save to local DB
                await db.staffTokens.put(data.token);
                validToken = data.token;
              }
            }
          }
          // Supabase validation for cloud mode
          if (!validToken) {
            try {
              const { supabase } = await import('@/integrations/supabase/client');
              const { data, error } = await supabase
                .from('sjjp_staff_tokens')
                .select('*')
                .eq('event_id', eventId)
                .eq('token', tokenString)
                .single();

              if (!error && data) {
                 validToken = {
                   id: data.id,
                   event_id: data.event_id,
                   token: data.token,
                   role: data.role,
                   status: data.status,
                   created_at: data.created_at,
                   expires_at: data.expires_at ? new Date(data.expires_at) : undefined,
                   max_uses: data.max_uses,
                   current_uses: data.current_uses,
                 };
                 // Save to local DB for future use
                 await db.staffTokens.put(validToken);
              } else if (error) {
                 console.warn('[useStaffAuth] Supabase validation error:', error);
              }
            } catch (supaErr) {
               console.error('[useStaffAuth] Supabase import or query failed:', supaErr);
            }
          }
        } catch (err) {
          console.warn('[useStaffAuth] Server validation failed:', err);
        }
      }

      if (!validToken) {
        const errorMsg = 'Token inválido ou expirado';
        setError(errorMsg);
        setIsLoading(false);
        return { valid: false, error: errorMsg };
      }

      // Create session
      const newSession = await db.createSession(
        validToken.id,
        tokenString,
        eventId,
        validToken.role
      );

      // Update token usage
      await db.staffTokens.update(validToken.id, {
        current_uses: validToken.current_uses + 1,
        last_accessed_at: new Date(),
      });

      // Store session ID for persistence
      localStorage.setItem('staff_session_id', newSession.id);

      // Notify via WebSocket if connected
      if (connectionManager.socket?.connected) {
        connectionManager.socket.emit('staff:connected', {
          session_id: newSession.id,
          event_id: eventId,
          role: validToken.role,
          device_info: getDeviceInfo(),
        });
      }

      setSession(newSession);
      setToken(validToken);
      setIsLoading(false);

      // Determine redirect path based on role
      const redirectPath = getRedirectPath(validToken.role, eventId, tokenString);

      return {
        valid: true,
        session: newSession,
        redirect_path: redirectPath,
      };
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao autenticar';
      setError(errorMsg);
      setIsLoading(false);
      return { valid: false, error: errorMsg };
    }
  }, []);

  /**
   * Logout current session
   */
  const logout = useCallback(async () => {
    if (session) {
      // Mark session as offline
      await db.activeSessions.update(session.id, { is_online: false });

      // Notify server
      if (connectionManager.socket?.connected) {
        connectionManager.socket.emit('staff:disconnected', {
          session_id: session.id,
        });
      }

      localStorage.removeItem('staff_session_id');
    }

    setSession(null);
    setToken(null);
    setError(null);
  }, [session]);

  /**
   * Check if current role has permission for a module
   */
  const checkPermission = useCallback((module: string): boolean => {
    if (!token) return false;
    return hasPermission(token.role, module);
  }, [token]);

  /**
   * Update last activity timestamp
   */
  const updateActivity = useCallback(async () => {
    if (session) {
      await db.activeSessions.update(session.id, {
        last_activity_at: new Date(),
      });
    }
  }, [session]);

  return {
    isLoading,
    isAuthenticated: !!session && !!token,
    session,
    token,
    error,
    authenticate,
    logout,
    checkPermission,
    updateActivity,
  };
}

/**
 * Get redirect path based on role
 */
function getRedirectPath(role: StaffRole, eventId: string, token: string): string {
  switch (role) {
    case 'check_in':
      return `/staff/${eventId}/check-in/${token}`;
    case 'bracket':
      return `/staff/${eventId}/bracket/${token}`;
    case 'results':
      return `/staff/${eventId}/results/${token}`;
    case 'admin':
      return `/events/${eventId}`;
    default:
      return `/staff/${eventId}/${token}`;
  }
}

export default useStaffAuth;
