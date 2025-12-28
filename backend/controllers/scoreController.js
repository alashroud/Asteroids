import supabase from '../config/supabase.js';

// Helper to check if Supabase is configured
const checkSupabase = (res) => {
  if (!supabase) {
    res.status(503).json({ 
      error: 'Database not configured. Please set up Supabase environment variables.' 
    });
    return false;
  }
  return true;
};

// Get all scores (leaderboard)
export const getScores = async (req, res) => {
  if (!checkSupabase(res)) return;
  
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .order('score', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching scores:', error);
      return res.status(500).json({ error: 'Failed to fetch scores' });
    }

    res.json({ data });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get a single score by ID
export const getScoreById = async (req, res) => {
  if (!checkSupabase(res)) return;
  
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching score:', error);
      return res.status(404).json({ error: 'Score not found' });
    }

    res.json({ data });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new score
export const createScore = async (req, res) => {
  if (!checkSupabase(res)) return;
  
  try {
    const { player_name, score, words_typed, accuracy, game_duration, difficulty } = req.body;

    // Validate required fields
    if (!player_name || typeof player_name !== 'string' || player_name.trim() === '' || score === undefined) {
      return res.status(400).json({ error: 'player_name and score are required' });
    }

    // Validate player_name length
    if (player_name.length > 50) {
      return res.status(400).json({ error: 'player_name must be 50 characters or less' });
    }

    // Validate score is a positive number
    if (typeof score !== 'number' || score < 0) {
      return res.status(400).json({ error: 'score must be a positive number' });
    }

    const { data, error } = await supabase
      .from('scores')
      .insert([
        {
          player_name,
          score,
          words_typed: words_typed || 0,
          accuracy: accuracy || 0,
          game_duration: game_duration || 0,
          difficulty: difficulty || 'normal'
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating score:', error);
      return res.status(500).json({ error: 'Failed to create score' });
    }

    res.status(201).json({ data });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get top scores for leaderboard
export const getLeaderboard = async (req, res) => {
  if (!checkSupabase(res)) return;
  
  try {
    const limit = parseInt(req.query.limit) || 10;

    const { data, error } = await supabase
      .from('scores')
      .select('player_name, score, words_typed, accuracy, difficulty, created_at')
      .order('score', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching leaderboard:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      // Return more detailed error for debugging
      return res.status(500).json({ 
        error: 'Failed to fetch leaderboard',
        details: error.message || error,
        code: error.code
      });
    }

    res.json({ data: data || [] });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ 
      error: 'Internal server error',
      details: err.message 
    });
  }
};
