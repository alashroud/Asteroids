/**
 * API Client for communicating with the Asteroids backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Add this for debugging (remove after confirming it works):
console.log('API Base URL:', API_BASE_URL);

// Helper function to ensure no double slashes
const getApiUrl = (path) => {
  const base = API_BASE_URL.replace(/\/$/, ''); // Remove trailing slash
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

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
  const url = getApiUrl('/api/scores');
  console.log('📤 Submitting score to:', url);
  console.log('📦 Score data:', scoreData);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors', // Explicitly set CORS mode
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(scoreData),
    });

    // Log response details for debugging
    console.log('📥 Response status:', response.status, response.statusText);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || `HTTP ${response.status}: ${response.statusText}` };
      }
      console.error('❌ API Error Response:', errorData);
      throw new Error(errorData.error || `Failed to submit score: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Score submitted successfully!', result);
    
    // Backend returns { data: {...} }, so extract the data
    return result.data || result;
  } catch (error) {
    // Better error logging
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error('❌ Network error - CORS or connection issue:', error.message);
      console.error('Make sure the backend CORS is configured to allow:', window.location.origin);
    } else {
      console.error('❌ Error submitting score:', error);
    }
    throw error;
  }
}

/**
 * Get the leaderboard (top scores)
 * @param {number} [limit=10] - Maximum number of scores to return
 * @returns {Promise<Array>} Array of top scores
 */
export async function getLeaderboard(limit = 10) {
  const url = getApiUrl(`/api/scores/leaderboard?limit=${limit}`);
  console.log('📤 Fetching leaderboard from:', url);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors', // Explicitly set CORS mode
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ Error fetching leaderboard:', errorData);
      throw new Error(errorData.error || 'Failed to fetch leaderboard');
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error('❌ Network error - CORS or connection issue:', error.message);
    } else {
      console.error('❌ Error fetching leaderboard:', error);
    }
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
      getApiUrl(`/api/scores?limit=${limit}&offset=${offset}`),
      {
        method: 'GET',
        mode: 'cors',
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch scores');
    }

    const result = await response.json();
    return result.data || [];
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
    const response = await fetch(getApiUrl('/health'), {
      method: 'GET',
      mode: 'cors',
    });
    
    if (response.ok) {
      console.log('✅ Backend API is healthy');
      return true;
    } else {
      console.warn('⚠️ Backend API health check failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ API health check failed:', error.message);
    return false;
  }
}

export default {
  submitScore,
  getLeaderboard,
  getScores,
  checkHealth,
};

