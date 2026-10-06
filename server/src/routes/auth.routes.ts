import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'hSecCyberSchoolSuperSecretKey2026!';

// 1. REGISTER NEW USER (Default: Student role_id = 2)
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name, role_id } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }

  try {
    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Default to Student (id: 2) unless specified and allowed
    const assignedRoleId = role_id && [1, 2].includes(Number(role_id)) ? Number(role_id) : 2;

    const result = await query(
      `INSERT INTO users (email, password_hash, name, role_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role_id, avatar_config, created_at`,
      [email.toLowerCase().trim(), passwordHash, name.trim(), assignedRoleId]
    );

    const newUser = result.rows[0];
    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: newUser
    });
  } catch (err: any) {
    console.error('[Register Error]', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// 2. LOGIN USER
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await query(
      `SELECT u.id, u.email, u.password_hash, u.name, u.role_id, u.avatar_config, u.status,
              r.name as role_name, r.priority as role_priority, r.permissions
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.email = $1`,
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account suspended or pending activation' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last_seen
    await query('UPDATE users SET last_seen = NOW() WHERE id = $1', [user.id]);

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Authenticated successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role_id: user.role_id,
        role_name: user.role_name,
        role_priority: user.role_priority,
        avatar_config: user.avatar_config,
        permissions: user.permissions
      }
    });
  } catch (err) {
    console.error('[Login Error]', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// 3. GET CURRENT AUTHENTICATED USER
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userRes = await query(
      `SELECT u.id, u.email, u.name, u.title, u.bio, u.avatar_config, u.role_id,
              r.name as role_name, r.priority as role_priority, r.permissions
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [req.user!.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: userRes.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// 4. UPDATE AVATAR & PROFILE
router.put('/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { name, title, bio, avatar_config } = req.body;

  try {
    const updateRes = await query(
      `UPDATE users
       SET name = COALESCE($1, name),
           title = COALESCE($2, title),
           bio = COALESCE($3, bio),
           avatar_config = COALESCE($4, avatar_config),
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, email, name, title, bio, avatar_config, role_id`,
      [name, title, bio, avatar_config ? JSON.stringify(avatar_config) : null, req.user!.id]
    );

    res.json({
      message: 'Profile updated successfully',
      user: updateRes.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
