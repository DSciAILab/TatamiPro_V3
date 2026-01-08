import { Router } from 'express';
import { db, addToSyncQueue } from '../database/sqlite';
import { io } from '../index';

export const eventsRouter = Router();

// Get all events
eventsRouter.get('/', (req, res) => {
  try {
    const events = db.prepare('SELECT * FROM events ORDER BY event_date DESC').all();
    res.json(events.map(parseEventJson));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get single event by ID
eventsRouter.get('/:id', (req, res) => {
  try {
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Get associated athletes
    const athletes = db.prepare('SELECT * FROM athletes WHERE event_id = ?').all(req.params.id);
    
    // Get associated divisions
    const divisions = db.prepare('SELECT * FROM divisions WHERE event_id = ?').all(req.params.id);
    
    res.json({
      ...parseEventJson(event),
      athletes: athletes.map(parseAthleteJson),
      divisions
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Update event
eventsRouter.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Build dynamic update query
    const fields = Object.keys(updates);
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => {
      const v = updates[f];
      if (typeof v === 'object') return JSON.stringify(v);
      if (typeof v === 'boolean') return v ? 1 : 0;
      return v;
    });
    
    const stmt = db.prepare(`
      UPDATE events 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP, synced = 0
      WHERE id = ?
    `);
    stmt.run(...values, id);
    
    // Add to sync queue
    addToSyncQueue('UPDATE', 'events', id, updates);
    
    // Broadcast update to all connected clients
    io.emit('event:updated', { eventId: id, updates });
    
    const updatedEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    res.json(parseEventJson(updatedEvent));
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Helper to parse JSON fields
function parseEventJson(event: any) {
  if (!event) return null;
  return {
    ...event,
    is_active: Boolean(event.is_active),
    include_third_place: Boolean(event.include_third_place),
    is_attendance_mandatory_before_check_in: Boolean(event.is_attendance_mandatory_before_check_in),
    is_weight_check_enabled: Boolean(event.is_weight_check_enabled),
    is_belt_grouping_enabled: Boolean(event.is_belt_grouping_enabled),
    is_overweight_auto_move_enabled: Boolean(event.is_overweight_auto_move_enabled),
    count_single_club_categories: Boolean(event.count_single_club_categories),
    count_walkover_single_fight_categories: Boolean(event.count_walkover_single_fight_categories),
    count_wo_champion_categories: Boolean(event.count_wo_champion_categories),
    mat_assignments: JSON.parse(event.mat_assignments || '{}'),
    brackets: JSON.parse(event.brackets || '{}'),
    mat_fight_order: JSON.parse(event.mat_fight_order || '{}'),
    age_division_settings: JSON.parse(event.age_division_settings || '[]'),
    check_in_config: JSON.parse(event.check_in_config || '{}'),
  };
}

function parseAthleteJson(athlete: any) {
  if (!athlete) return null;
  return {
    ...athlete,
    weight_attempts: JSON.parse(athlete.weight_attempts || '[]'),
  };
}
