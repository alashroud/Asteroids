import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import scoresRouter from './routes/scores.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Define allowed origins - explicitly list all allowed origins (NO trailing slashes)
const allowedOrigins = [
  'https://asteroids-prototype.vercel.app',
  'http://localhost:5173',
];

// Add FRONTEND_URL from env if it exists and isn't already in the list
if (process.env.FRONTEND_URL) {
  const frontendUrl = process.env.FRONTEND_URL.replace(/\/$/, ''); // Remove trailing slash
  if (!allowedOrigins.includes(frontendUrl)) {
    allowedOrigins.push(frontendUrl);
  }
}

// Helper to normalize origin (remove trailing slash)
const normalizeOrigin = (origin) => {
  return origin ? origin.replace(/\/$/, '') : origin;
};

// CORS configuration with detailed logging
app.use(cors({
  origin: function (origin, callback) {
    // Log every request for debugging
    console.log('🔍 CORS check - Received origin:', origin);
    console.log('🔍 Allowed origins:', allowedOrigins);
    
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      console.log('✅ Allowing request with no origin');
      return callback(null, true);
    }
    
    // Normalize the incoming origin by removing trailing slash
    const normalizedOrigin = normalizeOrigin(origin);
    console.log('🔍 Normalized origin:', normalizedOrigin);
    
    // Check if normalized origin matches any allowed origin (also normalized)
    const matchedOrigin = allowedOrigins.find(allowed => {
      const normalizedAllowed = normalizeOrigin(allowed);
      console.log(`🔍 Comparing: "${normalizedAllowed}" === "${normalizedOrigin}"?`, normalizedAllowed === normalizedOrigin);
      return normalizedAllowed === normalizedOrigin;
    });
    
    if (matchedOrigin) {
      console.log('✅ CORS allowed for origin:', origin);
      callback(null, origin);
    } else {
      console.warn(`❌ CORS blocked origin: ${origin} (normalized: ${normalizedOrigin})`);
      console.warn(`Allowed origins:`, allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json());

// Routes
app.use('/api/scores', scoresRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Asteroids Game API',
    version: '1.0.0',
    endpoints: {
      scores: '/api/scores',
      leaderboard: '/api/scores/leaderboard',
      health: '/health'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Something went wrong!' });
});

// For Vercel serverless, export the app
// For local development, start the server
if (process.env.VERCEL) {
  // Vercel serverless
  module.exports = app;
} else {
  // Local development
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
}

export default app;
