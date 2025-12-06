import express from 'express';
import {
  getScores,
  getScoreById,
  createScore,
  getLeaderboard
} from '../controllers/scoreController.js';

const router = express.Router();

// GET /api/scores - Get all scores with pagination
router.get('/', getScores);

// GET /api/scores/leaderboard - Get top scores for leaderboard
router.get('/leaderboard', getLeaderboard);

// GET /api/scores/:id - Get a specific score by ID
router.get('/:id', getScoreById);

// POST /api/scores - Create a new score
router.post('/', createScore);

export default router;
