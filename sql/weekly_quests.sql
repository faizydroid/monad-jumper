-- Create the weekly_quests table to store player weekly quests progress
CREATE TABLE IF NOT EXISTS public.weekly_quests (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(255) NOT NULL,
  last_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  games_played INTEGER NOT NULL DEFAULT 0,
  high_score INTEGER NOT NULL DEFAULT 0,
  claimed_games BOOLEAN[] DEFAULT '{false, false, false, false, false, false, false}',
  claimed_score BOOLEAN[] DEFAULT '{false, false, false, false, false, false}',
  last_total_games INTEGER NOT NULL DEFAULT 0,
  
  CONSTRAINT fk_wallet
    FOREIGN KEY (wallet_address)
    REFERENCES public.users(wallet_address)
    ON DELETE CASCADE
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_weekly_quests_wallet ON public.weekly_quests(wallet_address);
CREATE INDEX IF NOT EXISTS idx_weekly_quests_reset ON public.weekly_quests(last_reset);

-- Add function to get player's quest progress
CREATE OR REPLACE FUNCTION get_quest_progress(player_wallet VARCHAR)
RETURNS TABLE (
  games_played INTEGER,
  days_till_reset INTEGER,
  completed_quests INTEGER,
  claimed_rewards INTEGER
) AS $$
DECLARE
  reset_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get the last reset date
  SELECT last_reset INTO reset_date 
  FROM weekly_quests 
  WHERE wallet_address = player_wallet;
  
  RETURN QUERY
  SELECT 
    wq.games_played,
    GREATEST(0, 7 - EXTRACT(DAY FROM (NOW() - reset_date))::INTEGER) as days_till_reset,
    (SELECT COUNT(*) FROM UNNEST(wq.claimed_games) AS cg WHERE cg = true)::INTEGER as completed_quests,
    (SELECT COUNT(*) FROM UNNEST(wq.claimed_games) AS cg WHERE cg = true)::INTEGER as claimed_rewards
  FROM 
    weekly_quests wq
  WHERE 
    wallet_address = player_wallet;
END;
$$ LANGUAGE plpgsql; 