-- Add payment info fields to league_settings
ALTER TABLE league_settings 
ADD COLUMN IF NOT EXISTS payment_paypal TEXT,
ADD COLUMN IF NOT EXISTS payment_venmo TEXT,
ADD COLUMN IF NOT EXISTS payment_instructions TEXT;

-- Add regular season winner tracking
ALTER TABLE user_season_standings
ADD COLUMN IF NOT EXISTS is_regular_season_winner BOOLEAN DEFAULT FALSE;