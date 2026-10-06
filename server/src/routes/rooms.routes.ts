import { Router, Response } from 'express';
import { query } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// 1. GET ALL ROOMS WITH OCCUPANCY
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const roomsRes = await query(`
      SELECT r.*,
             COUNT(s.id) FILTER (WHERE s.left_at IS NULL) as current_occupancy
      FROM rooms r
      LEFT JOIN sessions s ON r.id = s.room_id
      GROUP BY r.id
      ORDER BY r.name ASC
    `);

    // Filter restricted rooms by user's role priority
    const userPriority = req.user!.role_priority;
    const rooms = roomsRes.rows.map(room => ({
      ...room,
      can_enter: userPriority >= room.min_role_priority
    }));

    res.json({ rooms });
  } catch (err) {
    console.error('[Rooms List Error]', err);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// 2. GET SPECIFIC ROOM & ACTIVE PARTICIPANTS
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const roomRes = await query('SELECT * FROM rooms WHERE id = $1', [id]);
    if (roomRes.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const room = roomRes.rows[0];

    // Check permission
    if (req.user!.role_priority < room.min_role_priority) {
      return res.status(403).json({
        error: `Security clearance insufficient for ${room.name}`
      });
    }

    // Active participants
    const participantsRes = await query(`
      SELECT u.id, u.name, u.title, u.avatar_config, s.is_mic_on, s.is_cam_on, s.is_screen_sharing,
             r.name as role_name, r.priority as role_priority
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      JOIN roles r ON u.role_id = r.id
      WHERE s.room_id = $1 AND s.left_at IS NULL
    `, [id]);

    res.json({
      room,
      participants: participantsRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch room details' });
  }
});

// 3. LOG AUTOMATIC ATTENDANCE CHECK-IN
router.post('/:id/checkin', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  try {
    await query(`
      INSERT INTO attendance (user_id, room_id, session_date, check_in_time)
      VALUES ($1, $2, CURRENT_DATE, NOW())
      ON CONFLICT (user_id, room_id, session_date) DO NOTHING
    `, [userId, id]);

    res.json({ success: true, message: 'Attendance recorded' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record attendance' });
  }
});

export default router;
