/**
 * API Client for communicating with the Asteroids backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Submit a new score to the leaderboard
 * @param {Object} scoreData - The score data to submit
 * @param {string} scoreData.player_name - Player's name (max 50 characters)
 * @param {number} scoreData.score - The player's score
 * @param {number} [scoreData.words_typed] - Number of words typed
 * @param {number} [scoreData.accuracy] - Typing accuracy percentage
 * @param {number} [scoreData.game_duration] - Game duration in seconds
 * @param {string} [scoreData.difficulty] - Game difficulty level
 * @returns {Promise<Object>} The created score data
 */
export async function submitScore(scoreData) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/scores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(scoreData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to submit score');
    }

    return await response.json();
  } catch (error) {
    console.error('Error submitting score:', error);
    throw error;
  }
}

/**
 * Get the leaderboard (top scores)
 * @param {number} [limit=10] - Maximum number of scores to return
 * @returns {Promise<Array>} Array of top scores
 */
export async function getLeaderboard(limit = 10) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/scores/leaderboard?limit=${limit}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch leaderboard');
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    throw error;
  }
}

/**
 * Get all scores with pagination
 * @param {Object} options - Pagination options
 * @param {number} [options.limit=10] - Maximum number of scores per page
 * @param {number} [options.offset=0] - Number of scores to skip
 * @returns {Promise<Array>} Array of scores
 */
export async function getScores({ limit = 10, offset = 0 } = {}) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/scores?limit=${limit}&offset=${offset}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch scores');
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error fetching scores:', error);
    throw error;
  }
}

/**
 * Check if the API is available
 * @returns {Promise<boolean>} True if API is healthy
 */
export async function checkHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
}

export default {
  submitScore,
  getLeaderboard,
  getScores,
  checkHealth,
};
