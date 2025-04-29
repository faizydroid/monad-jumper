-- Create the game_sessions table to store data for NadsBot
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  wallet_address VARCHAR(255) NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  jumps INTEGER NOT NULL DEFAULT 0,
  death_reason VARCHAR(50) DEFAULT 'fall',
  platform_types TEXT[] DEFAULT '{}',
  shots_fired INTEGER DEFAULT 0,
  enemies_killed INTEGER DEFAULT 0,
  max_height INTEGER DEFAULT 0,
  session_duration INTEGER DEFAULT 0,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_wallet
    FOREIGN KEY (wallet_address)
    REFERENCES public.users(wallet_address)
    ON DELETE CASCADE
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_game_sessions_wallet ON public.game_sessions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_game_sessions_score ON public.game_sessions(score DESC);
CREATE INDEX IF NOT EXISTS idx_game_sessions_timestamp ON public.game_sessions(timestamp DESC);

-- Add function to get player performance metrics
CREATE OR REPLACE FUNCTION get_player_metrics(player_wallet VARCHAR)
RETURNS TABLE (
  total_games INTEGER,
  avg_score FLOAT,
  max_score INTEGER,
  avg_jumps FLOAT,
  total_jumps INTEGER,
  common_death VARCHAR,
  avg_duration FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_games,
    AVG(score)::FLOAT as avg_score,
    MAX(score)::INTEGER as max_score,
    AVG(jumps)::FLOAT as avg_jumps,
    SUM(jumps)::INTEGER as total_jumps,
    (SELECT death_reason FROM game_sessions 
     WHERE wallet_address = player_wallet
     GROUP BY death_reason 
     ORDER BY COUNT(*) DESC LIMIT 1) as common_death,
    AVG(session_duration)::FLOAT as avg_duration
  FROM
    game_sessions
  WHERE
    wallet_address = player_wallet;
END;
$$ LANGUAGE plpgsql; 