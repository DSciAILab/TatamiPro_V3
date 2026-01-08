import Dexie, { Table } from 'dexie';
import { Event, Athlete, Division } from '@/types/index';
import { StaffAccessToken, StaffSession } from '@/types/staff-access';
import { EventSyncConfig } from '@/types/event-phases';

export interface PendingChange {
  id?: number;
  table: string;
  action: 'create' | 'update' | 'delete';
  data: any; // The payload
  timestamp: number;
  synced?: boolean;
  error?: string;
}

export interface EventSyncState {
  id: string; // event_id
  event_id: string;
  phase: string;
  sync_config: EventSyncConfig;
  last_sync_at?: number;
  pending_count: number;
}

class TatamiProDatabase extends Dexie {
  events!: Table<Event>;
  athletes!: Table<Athlete>;
  divisions!: Table<Division>;
  pendingChanges!: Table<PendingChange>;
  staffTokens!: Table<StaffAccessToken>;
  activeSessions!: Table<StaffSession>;
  eventSyncState!: Table<EventSyncState>;

  constructor() {
    super('TatamiProOfflineDB');
    
    // Version 1 - Original schema
    this.version(1).stores({
      events: 'id, app_id, updated_at',
      athletes: 'id, event_id, app_id, registration_status, check_in_status',
      divisions: 'id, event_id, app_id',
      pendingChanges: '++id, table, action, timestamp'
    });

    // Version 2 - Add staff access tables
    this.version(2).stores({
      events: 'id, app_id, updated_at',
      athletes: 'id, event_id, app_id, registration_status, check_in_status',
      divisions: 'id, event_id, app_id',
      pendingChanges: '++id, table, action, timestamp, synced',
      staffTokens: 'id, event_id, token, role, status, created_at, [event_id+token]',
      activeSessions: 'id, token_id, token, event_id, role, is_online',
      eventSyncState: 'id, event_id, phase'
    });
  }

  // Helper: Get all tokens for an event
  async getEventTokens(eventId: string): Promise<StaffAccessToken[]> {
    return this.staffTokens.where('event_id').equals(eventId).toArray();
  }

  // Helper: Validate a token
  async validateToken(token: string, eventId: string): Promise<StaffAccessToken | null> {
    // Usar índice composto [event_id+token]
    const staffToken = await this.staffTokens
      .where('[event_id+token]')
      .equals([eventId, token])
      .first();

    if (!staffToken) return null;
    if (staffToken.status !== 'active') return null;
    if (staffToken.expires_at && new Date(staffToken.expires_at) < new Date()) return null;
    if (staffToken.max_uses && staffToken.current_uses >= staffToken.max_uses) return null;

    return staffToken;
  }

  // Helper: Create a new session
  async createSession(tokenId: string, token: string, eventId: string, role: StaffAccessToken['role']): Promise<StaffSession> {
    const session: StaffSession = {
      id: crypto.randomUUID(),
      token_id: tokenId,
      token,
      event_id: eventId,
      role,
      connected_at: new Date(),
      last_activity_at: new Date(),
      is_online: true,
    };
    await this.activeSessions.put(session);
    return session;
  }

  // Helper: Get pending changes count
  async getPendingCount(): Promise<number> {
    try {
      const pending = await this.pendingChanges.filter(c => c.synced !== true).count();
      return pending;
    } catch {
      // Fallback if synced field doesn't exist
      return this.pendingChanges.count();
    }
  }

  // Helper: Get sync state for event
  async getEventSyncState(eventId: string): Promise<EventSyncState | undefined> {
    return this.eventSyncState.where('event_id').equals(eventId).first();
  }
}

export const db = new TatamiProDatabase();