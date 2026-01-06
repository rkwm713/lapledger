-- Add is_free_pick to driver_picks to mark Clash/All-Star picks
ALTER TABLE public.driver_picks 
ADD COLUMN IF NOT EXISTS is_free_pick boolean NOT NULL DEFAULT false;

-- Create league_settings table for entry fees, payouts, etc.
CREATE TABLE public.league_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  league_id uuid NOT NULL UNIQUE,
  entry_fee decimal(10,2) NOT NULL DEFAULT 100.00,
  payment_deadline date,
  payout_first integer NOT NULL DEFAULT 2200,
  payout_second integer NOT NULL DEFAULT 800,
  payout_third integer NOT NULL DEFAULT 400,
  payout_fourth integer NOT NULL DEFAULT 200,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on league_settings
ALTER TABLE public.league_settings ENABLE ROW LEVEL SECURITY;

-- League members can view settings
CREATE POLICY "Members can view league settings"
ON public.league_settings
FOR SELECT
USING (is_league_member(auth.uid(), league_id) OR is_league_owner(auth.uid(), league_id));

-- Only owners can manage settings
CREATE POLICY "Owners can insert league settings"
ON public.league_settings
FOR INSERT
WITH CHECK (is_league_owner(auth.uid(), league_id));

CREATE POLICY "Owners can update league settings"
ON public.league_settings
FOR UPDATE
USING (is_league_owner(auth.uid(), league_id));

CREATE POLICY "Owners can delete league settings"
ON public.league_settings
FOR DELETE
USING (is_league_owner(auth.uid(), league_id));

-- Trigger for updated_at
CREATE TRIGGER update_league_settings_updated_at
BEFORE UPDATE ON public.league_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create user_season_standings for tracking playoff points, wins, tiebreakers
CREATE TABLE public.user_season_standings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  league_id uuid NOT NULL,
  season integer NOT NULL,
  regular_season_points integer NOT NULL DEFAULT 0,
  playoff_points integer NOT NULL DEFAULT 0,
  race_wins integer NOT NULL DEFAULT 0,
  stage_wins integer NOT NULL DEFAULT 0,
  top_5s integer NOT NULL DEFAULT 0,
  top_10s integer NOT NULL DEFAULT 0,
  top_15s integer NOT NULL DEFAULT 0,
  top_20s integer NOT NULL DEFAULT 0,
  is_eliminated boolean NOT NULL DEFAULT false,
  elimination_round integer,
  is_wild_card boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, league_id, season)
);

-- Enable RLS on user_season_standings
ALTER TABLE public.user_season_standings ENABLE ROW LEVEL SECURITY;

-- Members can view standings in their leagues
CREATE POLICY "Members can view season standings"
ON public.user_season_standings
FOR SELECT
USING (is_league_member(auth.uid(), league_id));

-- Trigger for updated_at
CREATE TRIGGER update_user_season_standings_updated_at
BEFORE UPDATE ON public.user_season_standings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create free_pick_races table to track which races are free picks
CREATE TABLE public.free_pick_races (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  league_id uuid NOT NULL,
  race_id integer NOT NULL,
  race_name text NOT NULL,
  season integer NOT NULL,
  series text NOT NULL DEFAULT 'cup',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(league_id, race_id, season)
);

-- Enable RLS on free_pick_races
ALTER TABLE public.free_pick_races ENABLE ROW LEVEL SECURITY;

-- Members can view free pick races
CREATE POLICY "Members can view free pick races"
ON public.free_pick_races
FOR SELECT
USING (is_league_member(auth.uid(), league_id) OR is_league_owner(auth.uid(), league_id));

-- Owners can manage free pick races
CREATE POLICY "Owners can insert free pick races"
ON public.free_pick_races
FOR INSERT
WITH CHECK (is_league_owner(auth.uid(), league_id));

CREATE POLICY "Owners can delete free pick races"
ON public.free_pick_races
FOR DELETE
USING (is_league_owner(auth.uid(), league_id));