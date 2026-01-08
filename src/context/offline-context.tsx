"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db } from '@/lib/local-db';
import { supabase } from '@/integrations/supabase/client';
import { getAppId } from '@/lib/app-id';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { Event, Athlete, Division } from '@/types/index';

interface OfflineContextType {
  isOfflineMode: boolean;
  toggleOfflineMode: () => void;
  syncData: () => Promise<void>;
  hasPendingChanges: boolean;
  isSyncing: boolean;
  trackChange: (table: string, action: 'create' | 'update' | 'delete', data: any) => Promise<void>;
}

const REMOTE_TABLE_MAP: Record<string, string> = {
  events: 'sjjp_events',
  athletes: 'sjjp_athletes',
  divisions: 'sjjp_divisions',
  clubs: 'sjjp_clubs',
  profiles: 'sjjp_profiles',
};

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const OfflineProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('app-offline-mode') === 'true';
    }
    return false;
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('app-offline-mode', String(isOfflineMode));
    }
    checkPendingChanges();
  }, [isOfflineMode]);

  const checkPendingChanges = async () => {
    const count = await db.pendingChanges.count();
    setHasPendingChanges(count > 0);
  };

  const toggleOfflineMode = () => {
    setIsOfflineMode(prev => !prev);
  };

  // 1. Download data from Supabase to IndexedDB
  const pullData = async () => {
    const appId = await getAppId();
    
    // Fetch Events
    const { data: events, error: evErr } = await supabase.from('sjjp_events').select('*').eq('app_id', appId);
    if (evErr) throw evErr;
    await db.events.bulkPut(events as Event[]);

    // Fetch Divisions
    const { data: divisions, error: divErr } = await supabase.from('sjjp_divisions').select('*').eq('app_id', appId);
    if (divErr) throw divErr;
    await db.divisions.bulkPut(divisions as Division[]);

    // Fetch Athletes
    const { data: athletes, error: athErr } = await supabase.from('sjjp_athletes').select('*').eq('app_id', appId);
    if (athErr) throw athErr;
    await db.athletes.bulkPut(athletes as Athlete[]);
  };

  // 2. Upload pending changes from IndexedDB to Supabase
  const pushChanges = async () => {
    const changes = await db.pendingChanges.orderBy('timestamp').toArray();
    
    for (const change of changes) {
      const { table, action, data } = change;
      let error = null;

      const remoteTable = REMOTE_TABLE_MAP[table] || table;
      // Remove local-only fields if necessary or handle conflicts
      // For simplicity, we just replay the action
      if (action === 'create') {
        const { error: reqErr } = await supabase.from(remoteTable).insert(data);
        error = reqErr;
      } else if (action === 'update') {
        const { id, ...updateData } = data;
        const { error: reqErr } = await supabase.from(remoteTable).update(updateData).eq('id', id);
        error = reqErr;
      } else if (action === 'delete') {
        const { error: reqErr } = await supabase.from(remoteTable).delete().eq('id', data.id);
        error = reqErr;
      }

      if (error) {
        console.error(`Sync error on ${table} ${action}:`, error);
        // Strategy: Keep in queue or move to "failed queue"? 
        // For now, we abort sync to prevent data corruption sequence
        throw new Error(`Sync failed at ${table}/${action}: ${error.message}`);
      }

      // If success, remove from queue
      if (change.id) await db.pendingChanges.delete(change.id);
    }
  };

  const syncData = async () => {
    setIsSyncing(true);
    const toastId = showLoading('Sincronizando dados...');
    try {
      // 1. Push local changes first
      await pushChanges();
      
      // 2. Pull latest data from server
      await pullData();
      
      await checkPendingChanges();
      dismissToast(toastId);
      showSuccess('Sincronização completa!');
    } catch (error: any) {
      dismissToast(toastId);
      showError('Erro na sincronização: ' + error.message);
      console.error(error);
    } finally {
      setIsSyncing(false);
    }
  };

  const trackChange = async (table: string, action: 'create' | 'update' | 'delete', data: any) => {
    // Save to local DB immediately
    if (table === 'events') {
      if (action === 'delete') await db.events.delete(data.id);
      else await db.events.put(data);
    } else if (table === 'athletes') {
      if (action === 'delete') await db.athletes.delete(data.id);
      else await db.athletes.put(data);
    } else if (table === 'divisions') {
      if (action === 'delete') await db.divisions.delete(data.id);
      else await db.divisions.put(data);
    }

    // Add to sync queue if we are offline (or just always track to be safe, then sync clears it)
    // Here we assume we track everything locally so we can replay it.
    await db.pendingChanges.add({
      table,
      action,
      data,
      timestamp: Date.now()
    });
    setHasPendingChanges(true);
  };

  return (
    <OfflineContext.Provider value={{ isOfflineMode, toggleOfflineMode, syncData, hasPendingChanges, isSyncing, trackChange }}>
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};