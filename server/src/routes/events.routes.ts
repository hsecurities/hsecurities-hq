import { Router, Response } from 'express';
import { query } from '../db';
import { authenticateToken, AuthRequest, requireMinRole } from '../middleware/auth';

const router = Router();

// 1. GET UPCOMING EVENTS & WEBINARS
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const eventsRes = await query(`
      SELECT e.*, r.name as room_name, u.name as host_name
      FROM events e
      JOIN rooms r ON e.room_id = r.id
      JOIN users u ON e.host_id = u.id
      WHERE e.end_time >= NOW() - INTERVAL '2 hours'
      ORDER BY e.start_time ASC
    `);

    res.json({ events: eventsRes.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// 2. CREATE A NEW EVENT (Staff, Trainer, Admin: priority >= 3)
router.post('/', authenticateToken, requireMinRole(3), async (req: AuthRequest, res: Response) => {
  const { title, description, room_id, start_time, end_time, presentation_url, max_attendees } = req.body;
  const hostId = req.user!.id;

  if (!title || !room_id || !start_time || !end_time) {
    return res.status(400).json({ error: 'Title, room, start time, and end time are required' });
  }

  try {
    const newEvent = await query(`
      INSERT INTO events (title, description, room_id, host_id, start_time, end_time, presentation_url, max_attendees)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [title, description, room_id, hostId, start_time, end_time, presentation_url, max_attendees || 100]);

    res.status(201).json({ message: 'Event scheduled', event: newEvent.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// 3. GET CAMPUS ANNOUNCEMENTS
router.get('/announcements', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const annRes = await query(`
      SELECT a.*, u.name as author_name, r.name as author_role
      FROM announcements a
      JOIN users u ON a.author_id = u.id
      JOIN roles r ON u.role_id = r.id
      ORDER BY a.is_pinned DESC, a.created_at DESC
      LIMIT 20
    `);

    res.json({ announcements: annRes.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// 4. POST ANNOUNCEMENT (Trainer, Staff, Admin: priority >= 3)
router.post('/announcements', authenticateToken, requireMinRole(3), async (req: AuthRequest, res: Response) => {
  const { title, message, priority, is_pinned } = req.body;
  const authorId = req.user!.id;

  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required' });
  }

  try {
    const newAnn = await query(`
      INSERT INTO announcements (author_id, title, message, priority, is_pinned)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [authorId, title, message, priority || 'normal', is_pinned || false]);

    res.status(201).json({ announcement: newAnn.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

export default router;
