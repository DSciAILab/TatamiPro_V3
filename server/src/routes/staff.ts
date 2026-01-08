import { Router, Request, Response } from 'express';
import { db } from '../database/sqlite';
import { v4 as uuidv4 } from 'uuid';

export const staffRouter = Router();

interface StaffToken {
  id: string;
  event_id: string;
  role: string;
  token: string;
  nickname?: string;
  created_by?: string;
  created_at: string;
  expires_at?: string;
  last_accessed_at?: string;
  status: string;
  max_uses?: number;
  current_uses: number;
}

/**
 * Validate a staff token
 * POST /api/staff/validate
 */
staffRouter.post('/validate', async (req: Request, res: Response) => {
  try {
    const { token, event_id } = req.body;

    if (!token || !event_id) {
      return res.status(400).json({ error: 'Token and event_id are required' });
    }

    const staffToken = db.prepare(`
      SELECT * FROM staff_tokens 
      WHERE token = ? AND event_id = ? AND status = 'active'
    `).get(token, event_id) as StaffToken | undefined;

    if (!staffToken) {
      return res.status(401).json({ error: 'Invalid token', valid: false });
    }

    // Check expiration
    if (staffToken.expires_at && new Date(staffToken.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Token expired', valid: false });
    }

    // Check max uses
    if (staffToken.max_uses && staffToken.current_uses >= staffToken.max_uses) {
      return res.status(401).json({ error: 'Token usage limit reached', valid: false });
    }

    // Update last accessed and usage count
    db.prepare(`
      UPDATE staff_tokens 
      SET last_accessed_at = datetime('now'), current_uses = current_uses + 1 
      WHERE id = ?
    `).run(staffToken.id);

    // Create session
    const sessionId = uuidv4();
    db.prepare(`
      INSERT INTO staff_sessions (id, token_id, token, event_id, role, connected_at, last_activity_at, is_online)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'), 1)
    `).run(sessionId, staffToken.id, token, event_id, staffToken.role);

    res.json({
      valid: true,
      token: staffToken,
      session: {
        id: sessionId,
        token_id: staffToken.id,
        event_id,
        role: staffToken.role,
      },
    });
  } catch (error: any) {
    console.error('[Staff API] Validate error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all tokens for an event
 * GET /api/staff/tokens/:eventId
 */
staffRouter.get('/tokens/:eventId', (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const tokens = db.prepare(`
      SELECT * FROM staff_tokens WHERE event_id = ?
      ORDER BY created_at DESC
    `).all(eventId) as StaffToken[];

    res.json(tokens);
  } catch (error: any) {
    console.error('[Staff API] Get tokens error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create a new token
 * POST /api/staff/tokens
 */
staffRouter.post('/tokens', (req: Request, res: Response) => {
  try {
    const { event_id, role, nickname, expires_at, max_uses, created_by } = req.body;

    if (!event_id || !role) {
      return res.status(400).json({ error: 'event_id and role are required' });
    }

    const id = uuidv4();
    const token = uuidv4();

    db.prepare(`
      INSERT INTO staff_tokens (id, event_id, role, token, nickname, created_by, created_at, expires_at, status, max_uses, current_uses)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?, 'active', ?, 0)
    `).run(id, event_id, role, token, nickname || null, created_by || null, expires_at || null, max_uses || null);

    const newToken = db.prepare('SELECT * FROM staff_tokens WHERE id = ?').get(id);

    res.status(201).json(newToken);
  } catch (error: any) {
    console.error('[Staff API] Create token error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Revoke a token
 * DELETE /api/staff/tokens/:tokenId
 */
staffRouter.delete('/tokens/:tokenId', (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params;

    db.prepare(`UPDATE staff_tokens SET status = 'revoked' WHERE id = ?`).run(tokenId);

    // Disconnect all sessions using this token
    db.prepare(`UPDATE staff_sessions SET is_online = 0 WHERE token_id = ?`).run(tokenId);

    res.json({ success: true });
  } catch (error: any) {
    console.error('[Staff API] Revoke token error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get connected clients for an event
 * GET /api/staff/clients/:eventId
 */
staffRouter.get('/clients/:eventId', (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const clients = db.prepare(`
      SELECT 
        s.id as session_id,
        s.token_id,
        t.nickname,
        s.role,
        s.connected_at,
        s.last_activity_at,
        s.is_online,
        s.device_info
      FROM staff_sessions s
      JOIN staff_tokens t ON s.token_id = t.id
      WHERE s.event_id = ? AND s.is_online = 1
      ORDER BY s.last_activity_at DESC
    `).all(eventId);

    res.json(clients);
  } catch (error: any) {
    console.error('[Staff API] Get clients error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Disconnect a session
 * POST /api/staff/disconnect/:sessionId
 */
staffRouter.post('/disconnect/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    db.prepare(`UPDATE staff_sessions SET is_online = 0 WHERE id = ?`).run(sessionId);

    res.json({ success: true });
  } catch (error: any) {
    console.error('[Staff API] Disconnect error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default staffRouter;
