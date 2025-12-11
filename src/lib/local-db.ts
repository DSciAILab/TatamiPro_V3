import Dexie, { Table } from 'dexie';
import { Event, Athlete, Division } from '@/types/index';

export interface PendingChange {
  id?: number;
  table: string;
  action: 'create' | 'update' | 'delete';
  data: any; // The payload
  timestamp: number;
}

class TatamiProDatabase extends Dexie {
  events!: Table<Event>;
  athletes!: Table<Athlete>;
  divisions!: Table<Division>;
  pendingChanges!: Table<PendingChange>;

  constructor() {
    super('TatamiProOfflineDB');
    this.version(1).stores({
      events: 'id, app_id, updated_at',
      athletes: 'id, event_id, app_id, registration_status, check_in_status',
      divisions: 'id, event_id, app_id',
      pendingChanges: '++id, table, action, timestamp' // Auto-incrementing primary key
    });
  }
}

export const db = new TatamiProDatabase();