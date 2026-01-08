import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'competition.db');
export const db = new Database(dbPath);

export function initDatabase() {
  console.log('📦 Initializing SQLite database...');
  
  // Enable WAL mode for better concurrent access
  db.pragma('journal_mode = WAL');
  
  // Create events table
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'Aberto',
      event_date TEXT,
      is_active INTEGER DEFAULT 1,
      champion_points INTEGER DEFAULT 9,
      runner_up_points INTEGER DEFAULT 3,
      third_place_points INTEGER DEFAULT 1,
      count_single_club_categories INTEGER DEFAULT 1,
      count_walkover_single_fight_categories INTEGER DEFAULT 1,
      count_wo_champion_categories INTEGER DEFAULT 0,
      num_fight_areas INTEGER DEFAULT 1,
      include_third_place INTEGER DEFAULT 0,
      is_attendance_mandatory_before_check_in INTEGER DEFAULT 0,
      is_weight_check_enabled INTEGER DEFAULT 1,
      is_belt_grouping_enabled INTEGER DEFAULT 1,
      is_overweight_auto_move_enabled INTEGER DEFAULT 0,
      check_in_scan_mode TEXT DEFAULT 'qr',
      mat_assignments TEXT DEFAULT '{}',
      brackets TEXT DEFAULT '{}',
      mat_fight_order TEXT DEFAULT '{}',
      age_division_settings TEXT DEFAULT '[]',
      check_in_config TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      synced INTEGER DEFAULT 0
    )
  `);
  
  // Create athletes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS athletes (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      division_id TEXT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      date_of_birth TEXT,
      gender TEXT,
      belt TEXT,
      weight REAL,
      club TEXT,
      nationality TEXT,
      email TEXT,
      phone TEXT,
      emirates_id TEXT,
      school_id TEXT,
      age INTEGER,
      age_division TEXT,
      weight_division TEXT,
      registration_qr_code_id TEXT,
      photo_url TEXT,
      emirates_id_front_url TEXT,
      emirates_id_back_url TEXT,
      payment_proof_url TEXT,
      registration_status TEXT DEFAULT 'under_approval',
      check_in_status TEXT DEFAULT 'pending',
      registered_weight REAL,
      weight_attempts TEXT DEFAULT '[]',
      attendance_status TEXT DEFAULT 'pending',
      moved_to_division_id TEXT,
      move_reason TEXT,
      seed INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      synced INTEGER DEFAULT 0,
      FOREIGN KEY (event_id) REFERENCES events(id)
    )
  `);
  
  // Create divisions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS divisions (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      name TEXT NOT NULL,
      gender TEXT,
      age_division TEXT,
      belt TEXT,
      weight_division TEXT,
      mat_assignment TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      synced INTEGER DEFAULT 0,
      FOREIGN KEY (event_id) REFERENCES events(id)
    )
  `);
  
  // Create sync_queue table for offline changes
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operation TEXT NOT NULL,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      data TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      attempts INTEGER DEFAULT 0,
      last_error TEXT
    )
  `);
  
  console.log('✅ Database tables created/verified');
}

// Helper to add to sync queue
export function addToSyncQueue(operation: string, tableName: string, recordId: string, data: any) {
  const stmt = db.prepare(`
    INSERT INTO sync_queue (operation, table_name, record_id, data)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(operation, tableName, recordId, JSON.stringify(data));
}
