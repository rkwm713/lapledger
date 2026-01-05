-- First drop the generated column that depends on the other columns
ALTER TABLE public.user_race_scores DROP COLUMN IF EXISTS total_points;

-- Now we can safely drop the driver columns
ALTER TABLE public.user_race_scores DROP COLUMN IF EXISTS driver_1_points;
ALTER TABLE public.user_race_scores DROP COLUMN IF EXISTS driver_2_points;

-- Add new columns for single driver model
ALTER TABLE public.user_race_scores ADD COLUMN IF NOT EXISTS driver_id INTEGER;
ALTER TABLE public.user_race_scores ADD COLUMN IF NOT EXISTS driver_name TEXT;
ALTER TABLE public.user_race_scores ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0;

-- Modify driver_picks table for per-race picking
ALTER TABLE public.driver_picks DROP COLUMN IF EXISTS pick_order;
ALTER TABLE public.driver_picks ADD COLUMN IF NOT EXISTS race_id INTEGER;
ALTER TABLE public.driver_picks ADD COLUMN IF NOT EXISTS race_name TEXT;
ALTER TABLE public.driver_picks ADD COLUMN IF NOT EXISTS race_date TIMESTAMPTZ;

-- Update constraint for one pick per user per race per league
ALTER TABLE public.driver_picks DROP CONSTRAINT IF EXISTS driver_picks_league_id_user_id_pick_order_season_key;
ALTER TABLE public.driver_picks ADD CONSTRAINT unique_pick_per_race UNIQUE (league_id, user_id, race_id);