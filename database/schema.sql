-- Supabase SQL Schema for Asteroids Game
-- This schema creates the necessary tables for the game leaderboard

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Scores table to store player game scores
CREATE TABLE IF NOT EXISTS scores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    player_name VARCHAR(50) NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    words_typed INTEGER NOT NULL DEFAULT 0,
    accuracy DECIMAL(5,2) DEFAULT 0.00,
    game_duration (10,2) DEFAULT 0, -- in seconds
    difficulty VARCHAR(20) DEFAULT 'normal',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create an index on score for faster leaderboard queries
CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);

-- Create an index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_scores_created_at ON scores(created_at DESC);

-- Row Level Security (RLS) policies for Supabase
-- Enable RLS on the scores table
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to read scores (for leaderboard)
CREATE POLICY "Allow public read access" ON scores
    FOR SELECT
    USING (true);

-- Policy: Allow anyone to insert scores (for submitting game results)
CREATE POLICY "Allow public insert access" ON scores
    FOR INSERT
    WITH CHECK (true);

-- Optional: Create a view for the top 10 leaderboard
CREATE OR REPLACE VIEW leaderboard AS
SELECT 
    player_name,
    score,
    words_typed,
    accuracy,
    difficulty,
    created_at
FROM scores
ORDER BY score DESC
LIMIT 10;
