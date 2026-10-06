import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'hSecCyberSchoolSuperSecretKey2026!';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role_id: number;
  role_name: string;
  role_priority: number;
  permissions: Record<string, any>;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const result = await query(
      `SELECT u.id, u.email, u.name, u.role_id, r.name as role_name, r.priority as role_priority, r.permissions
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1 AND u.status = 'active'`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'User account disabled or not found' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired session token' });
  }
};

export const requireMinRole = (minPriority: number) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role_priority < minPriority) {
      return res.status(403).json({
        error: `Insufficient access level. Required clearance priority: ${minPriority}`
      });
    }
    next();
  };
};

export const requirePermission = (permissionKey: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const perms = req.user.permissions || {};
    if (perms.all || perms[permissionKey]) {
      return next();
    }
    return res.status(403).json({
      error: `Access denied. Missing permission: ${permissionKey}`
    });
  };
};
