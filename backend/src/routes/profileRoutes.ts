import { Router, Request, Response } from 'express';
import { query, isConnected, listMemoryGames } from '../db.js';

export const profileRouter = Router();

// GET /api/u/:username - Fetch player profile & badges
profileRouter.get('/:username', async (req: Request, res: Response) => {
  try {
    const username = String(req.params.username);

    let userGames: any[] = [];
    let userScores: any[] = [];

    if (isConnected()) {
      const gamesRes = await query(`SELECT id, title, slug, template, play_count, remix_count, created_at FROM games WHERE is_published = true LIMIT 10;`);
      userGames = gamesRes.rows;

      const scoresRes = await query(`SELECT id, game_id, username, value, created_at FROM scores WHERE username ILIKE $1 ORDER BY value DESC LIMIT 10;`, [username]);
      userScores = scoresRes.rows;
    } else {
      userGames = listMemoryGames().filter((g) => g.is_published);
      userScores = [
        { id: '1', username, value: 1420, gameTitle: 'Neon Dash Runner', created_at: new Date().toISOString() },
        { id: '2', username, value: 980, gameTitle: 'Cyber Survival Dodge', created_at: new Date().toISOString() },
      ];
    }

    const createdCount = userGames.length;
    const highScoresCount = userScores.length;
    const reputationScore = createdCount * 50 + highScoresCount * 20 + 100;

    // Badges calculation
    const badges = [];
    if (createdCount >= 1) badges.push({ id: 'first_creator', name: 'First Creator', icon: '🎨', desc: 'Published a custom game schema' });
    if (highScoresCount >= 1) badges.push({ id: 'high_scorer', name: 'High Scorer', icon: '🏆', desc: 'Achieved an Arcade leaderboard score' });
    if (reputationScore >= 150) badges.push({ id: 'arcade_legend', name: 'Arcade Legend', icon: '⚡', desc: 'Reached 150+ Reputation Points' });

    return res.json({
      username,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
      reputationScore,
      createdCount,
      highScoresCount,
      badges,
      createdGames: userGames,
      recentScores: userScores,
    });
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: error.message });
  }
});
