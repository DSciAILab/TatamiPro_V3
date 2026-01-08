import { db } from '../database/sqlite';

interface SyncQueueItem {
  id: number;
  operation: string;
  table_name: string;
  record_id: string;
  data: string;
  created_at: string;
  attempts: number;
  last_error: string | null;
}

export class SyncService {
  private supabaseUrl: string;
  private supabaseKey: string;
  private isOnline: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL || '';
    this.supabaseKey = process.env.SUPABASE_KEY || '';
  }

  async checkConnection(): Promise<boolean> {
    if (!this.supabaseUrl) {
      return false;
    }
    
    try {
      const response = await fetch(`${this.supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': this.supabaseKey,
        }
      });
      this.isOnline = response.ok;
      return this.isOnline;
    } catch {
      this.isOnline = false;
      return false;
    }
  }

  startBackgroundSync() {
    console.log('🔄 Starting background sync service...');
    
    // Check connection every 30 seconds
    this.syncInterval = setInterval(async () => {
      const wasOnline = this.isOnline;
      await this.checkConnection();
      
      if (!wasOnline && this.isOnline) {
        console.log('📶 Connection restored! Starting sync...');
        await this.processQueue();
      }
    }, 30000);
    
    // Initial check
    this.checkConnection();
  }

  async processQueue() {
    if (!this.isOnline) {
      console.log('⏸️ Offline - queuing changes for later sync');
      return;
    }

    const pendingItems = db.prepare(`
      SELECT * FROM sync_queue 
      WHERE attempts < 5 
      ORDER BY created_at ASC
      LIMIT 100
    `).all() as SyncQueueItem[];

    if (pendingItems.length === 0) {
      console.log('✅ No pending items to sync');
      return;
    }

    console.log(`📤 Syncing ${pendingItems.length} pending changes...`);

    for (const item of pendingItems) {
      try {
        await this.syncItem(item);
        
        // Remove from queue on success
        db.prepare('DELETE FROM sync_queue WHERE id = ?').run(item.id);
        
        // Mark record as synced
        db.prepare(`UPDATE ${item.table_name} SET synced = 1 WHERE id = ?`)
          .run(item.record_id);
          
      } catch (error: any) {
        // Update attempt count and error
        db.prepare(`
          UPDATE sync_queue 
          SET attempts = attempts + 1, last_error = ?
          WHERE id = ?
        `).run(error.message, item.id);
        
        console.error(`❌ Sync failed for ${item.table_name}:${item.record_id}:`, error.message);
      }
    }
  }

  private async syncItem(item: SyncQueueItem): Promise<void> {
    const data = JSON.parse(item.data);
    const endpoint = `${this.supabaseUrl}/rest/v1/${item.table_name}`;
    
    let method = 'PATCH';
    let url = `${endpoint}?id=eq.${item.record_id}`;
    
    if (item.operation === 'INSERT') {
      method = 'POST';
      url = endpoint;
    } else if (item.operation === 'DELETE') {
      method = 'DELETE';
    }

    const response = await fetch(url, {
      method,
      headers: {
        'apikey': this.supabaseKey,
        'Authorization': `Bearer ${this.supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: method !== 'DELETE' ? JSON.stringify(data) : undefined
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
  }

  getPendingCount(): number {
    const result = db.prepare('SELECT COUNT(*) as count FROM sync_queue').get() as any;
    return result?.count || 0;
  }

  getStatus() {
    return {
      isOnline: this.isOnline,
      pendingChanges: this.getPendingCount(),
      supabaseConfigured: Boolean(this.supabaseUrl)
    };
  }

  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}
