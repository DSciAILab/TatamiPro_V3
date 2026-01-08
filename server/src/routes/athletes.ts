import { Router } from 'express';
import { db, addToSyncQueue } from '../database/sqlite';
import { io } from '../index';

export const athletesRouter = Router();

// Get all athletes (optionally by event)
athletesRouter.get('/', (req, res) => {
  try {
    const { event_id } = req.query;
    let query = 'SELECT * FROM athletes';
    let params: any[] = [];
    
    if (event_id) {
      query += ' WHERE event_id = ?';
      params.push(event_id);
    }
    
    const athletes = db.prepare(query).all(...params);
    res.json(athletes.map(parseAthleteJson));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch athletes' });
  }
});

// Get single athlete
athletesRouter.get('/:id', (req, res) => {
  try {
    const athlete = db.prepare('SELECT * FROM athletes WHERE id = ?').get(req.params.id);
    if (!athlete) {
      return res.status(404).json({ error: 'Athlete not found' });
    }
    res.json(parseAthleteJson(athlete));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch athlete' });
  }
});

// Update athlete
athletesRouter.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Build dynamic update query
    const fields = Object.keys(updates);
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => {
      const v = updates[f];
      if (Array.isArray(v)) return JSON.stringify(v);
      if (typeof v === 'object' && v !== null) return JSON.stringify(v);
      return v;
    });
    
    const stmt = db.prepare(`
      UPDATE athletes 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP, synced = 0
      WHERE id = ?
    `);
    stmt.run(...values, id);
    
    // Add to sync queue
    addToSyncQueue('UPDATE', 'athletes', id, updates);
    
    // Get the athlete's event_id for broadcasting
    const athlete = db.prepare('SELECT * FROM athletes WHERE id = ?').get(id) as any;
    
    // Broadcast update to all connected clients
    io.emit('athlete:updated', { 
      athleteId: id, 
      eventId: athlete?.event_id,
      updates 
    });
    
    res.json(parseAthleteJson(athlete));
  } catch (error) {
    console.error('Update athlete error:', error);
    res.status(500).json({ error: 'Failed to update athlete' });
  }
});

// Batch update athletes (for check-in, attendance, etc.)
athletesRouter.post('/batch-update', (req, res) => {
  try {
    const { athletes } = req.body;
    
    const updateStmt = db.prepare(`
      UPDATE athletes 
      SET check_in_status = ?, attendance_status = ?, updated_at = CURRENT_TIMESTAMP, synced = 0
      WHERE id = ?
    `);
    
    const transaction = db.transaction((athletes: any[]) => {
      for (const athlete of athletes) {
        updateStmt.run(
          athlete.check_in_status || 'pending',
          athlete.attendance_status || 'pending',
          athlete.id
        );
        addToSyncQueue('UPDATE', 'athletes', athlete.id, athlete);
      }
    });
    
    transaction(athletes);
    
    // Broadcast batch update
    io.emit('athletes:batch-updated', { athletes });
    
    res.json({ success: true, count: athletes.length });
  } catch (error) {
    console.error('Batch update error:', error);
    res.status(500).json({ error: 'Failed to batch update athletes' });
  }
});

function parseAthleteJson(athlete: any) {
  if (!athlete) return null;
  return {
    ...athlete,
    weight_attempts: JSON.parse(athlete.weight_attempts || '[]'),
  };
}
