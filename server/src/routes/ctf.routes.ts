import { Router, Response } from 'express';
import crypto from 'crypto';
import { query } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// 1. GET ALL ACTIVE CTF CHALLENGES
router.get('/challenges', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  try {
    const challengesRes = await query(`
      SELECT c.id, c.title, c.category, c.difficulty, c.points, c.description, c.hint,
             EXISTS(SELECT 1 FROM ctf_submissions s WHERE s.challenge_id = c.id AND s.user_id = $1 AND s.is_correct = true) as solved
      FROM ctf_challenges c
      WHERE c.is_active = true
      ORDER BY c.points ASC
    `, [userId]);

    res.json({ challenges: challengesRes.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch CTF challenges' });
  }
});

// 2. SUBMIT A FLAG
router.post('/submit', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { challenge_id, flag, team_name } = req.body;
  const userId = req.user!.id;

  if (!challenge_id || !flag) {
    return res.status(400).json({ error: 'Challenge ID and flag are required' });
  }

  try {
    // Check if already solved
    const alreadySolved = await query(
      'SELECT id FROM ctf_submissions WHERE user_id = $1 AND challenge_id = $2 AND is_correct = true',
      [userId, challenge_id]
    );

    if (alreadySolved.rows.length > 0) {
      return res.status(400).json({ error: 'You have already solved this challenge!' });
    }

    const challengeRes = await query('SELECT * FROM ctf_challenges WHERE id = $1', [challenge_id]);
    if (challengeRes.rows.length === 0) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const challenge = challengeRes.rows[0];

    // Compute hash of submitted flag (trim whitespace)
    const cleanFlag = flag.trim();
    const md5Hash = crypto.createHash('md5').update(cleanFlag).digest('hex');
    const shaHash = crypto.createHash('sha256').update(cleanFlag).digest('hex');

    const isCorrect = (md5Hash === challenge.flag_hash || shaHash === challenge.flag_hash || cleanFlag === challenge.flag_hash);
    const pointsAwarded = isCorrect ? challenge.points : 0;

    await query(`
      INSERT INTO ctf_submissions (user_id, challenge_id, team_name, submitted_flag, is_correct, awarded_points)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [userId, challenge_id, team_name || 'Independent', cleanFlag, isCorrect, pointsAwarded]);

    if (isCorrect) {
      return res.json({
        success: true,
        correct: true,
        points: pointsAwarded,
        message: `🎉 Correct Flag! You earned ${pointsAwarded} points!`
      });
    } else {
      return res.json({
        success: true,
        correct: false,
        message: '❌ Incorrect flag. Try again!'
      });
    }
  } catch (err) {
    console.error('[CTF Submit Error]', err);
    res.status(500).json({ error: 'Error submitting flag' });
  }
});

// 3. LIVE SCOREBOARD & LEADERBOARD
router.get('/leaderboard', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const leaderboardRes = await query(`
      SELECT u.id, u.name, u.title, u.avatar_config,
             COALESCE(SUM(s.awarded_points), 0) as total_points,
             COUNT(DISTINCT s.challenge_id) FILTER (WHERE s.is_correct = true) as solved_count,
             MAX(s.submitted_at) as last_solve_time
      FROM users u
      JOIN ctf_submissions s ON u.id = s.user_id AND s.is_correct = true
      GROUP BY u.id
      ORDER BY total_points DESC, last_solve_time ASC
      LIMIT 50
    `);

    res.json({ leaderboard: leaderboardRes.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export default router;
