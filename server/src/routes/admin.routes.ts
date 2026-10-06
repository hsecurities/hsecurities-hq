import { Router, Response } from 'express';
import { query } from '../db';
import { authenticateToken, AuthRequest, requireMinRole } from '../middleware/auth';

const router = Router();

// All routes require Admin (priority >= 6)
router.use(authenticateToken);
router.use(requireMinRole(6));

// 1. USER MANAGEMENT - LIST USERS
router.get('/users', async (req: AuthRequest, res: Response) => {
  const { search, role_id, status } = req.query;

  try {
    let sql = `
      SELECT u.id, u.email, u.name, u.title, u.status, u.created_at, u.last_seen,
             r.id as role_id, r.name as role_name, r.priority as role_priority
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
    }
    if (role_id) {
      params.push(role_id);
      sql += ` AND u.role_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      sql += ` AND u.status = $${params.length}`;
    }

    sql += ' ORDER BY u.created_at DESC LIMIT 100';

    const usersRes = await query(sql, params);
    res.json({ users: usersRes.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user directory' });
  }
});

// 2. USER MANAGEMENT - UPDATE ROLE OR STATUS
router.put('/users/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { role_id, status, title } = req.body;

  try {
    const updateRes = await query(`
      UPDATE users
      SET role_id = COALESCE($1, role_id),
          status = COALESCE($2, status),
          title = COALESCE($3, title),
          updated_at = NOW()
      WHERE id = $4
      RETURNING id, email, name, role_id, status, title
    `, [role_id, status, title, id]);

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User updated', user: updateRes.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// 3. ROLE MANAGEMENT - LIST ROLES
router.get('/roles', async (req: AuthRequest, res: Response) => {
  try {
    const rolesRes = await query('SELECT * FROM roles ORDER BY priority ASC');
    res.json({ roles: rolesRes.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// 4. ROOM MANAGEMENT - UPDATE RESTRICTIONS & MIN ROLE
router.put('/rooms/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { capacity, is_restricted, min_role_priority, features } = req.body;

  try {
    const updateRes = await query(`
      UPDATE rooms
      SET capacity = COALESCE($1, capacity),
          is_restricted = COALESCE($2, is_restricted),
          min_role_priority = COALESCE($3, min_role_priority),
          features = COALESCE($4, features)
      WHERE id = $5
      RETURNING *
    `, [capacity, is_restricted, min_role_priority, features ? JSON.stringify(features) : null, id]);

    res.json({ message: 'Room configuration updated', room: updateRes.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update room configuration' });
  }
});

// 5. ATTENDANCE REPORTS
router.get('/attendance', async (req: AuthRequest, res: Response) => {
  const { room_id, date } = req.query;

  try {
    let sql = `
      SELECT a.*, u.name as user_name, u.email as user_email, r.name as room_name
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      JOIN rooms r ON a.room_id = r.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (room_id) {
      params.push(room_id);
      sql += ` AND a.room_id = $${params.length}`;
    }
    if (date) {
      params.push(date);
      sql += ` AND a.session_date = $${params.length}`;
    }

    sql += ' ORDER BY a.check_in_time DESC LIMIT 200';

    const attRes = await query(sql, params);
    res.json({ attendance: attRes.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
});

// 6. ANALYTICS DASHBOARD STATS
router.get('/analytics', async (req: AuthRequest, res: Response) => {
  try {
    // Total users count
    const usersCount = await query("SELECT COUNT(*) as total FROM users WHERE status = 'active'");
    // Active sessions currently online
    const activeSessions = await query("SELECT COUNT(*) as online FROM sessions WHERE left_at IS NULL");
    // CTF challenge solve count
    const ctfSolves = await query("SELECT COUNT(*) as solves FROM ctf_submissions WHERE is_correct = true");
    // Room occupancy breakdown
    const roomBreakdown = await query(`
      SELECT r.id, r.name, COUNT(s.id) as current_users
      FROM rooms r
      LEFT JOIN sessions s ON r.id = s.room_id AND s.left_at IS NULL
      GROUP BY r.id, r.name
      ORDER BY current_users DESC
    `);

    res.json({
      analytics: {
        total_registered_users: parseInt(usersCount.rows[0].total),
        current_online_users: parseInt(activeSessions.rows[0].online),
        total_ctf_solves: parseInt(ctfSolves.rows[0].solves),
        rooms_occupancy: roomBreakdown.rows
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;
