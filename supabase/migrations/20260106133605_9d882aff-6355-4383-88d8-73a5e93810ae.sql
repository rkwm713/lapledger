-- Create chase_rounds table to track round configuration
CREATE TABLE public.chase_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  season INTEGER NOT NULL,
  round_number INTEGER NOT NULL DEFAULT 0,
  start_race_number INTEGER,
  end_race_number INTEGER,
  players_remaining INTEGER NOT NULL DEFAULT 23,
  is_active BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(league_id, season, round_number)
);

-- Create chase_eliminations table to track elimination history
CREATE TABLE public.chase_eliminations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  season INTEGER NOT NULL,
  eliminated_round INTEGER NOT NULL,
  final_position INTEGER,
  playoff_points_at_elimination INTEGER DEFAULT 0,
  eliminated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(league_id, user_id, season)
);

-- Enable RLS on both tables
ALTER TABLE public.chase_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chase_eliminations ENABLE ROW LEVEL SECURITY;

-- RLS policies for chase_rounds
CREATE POLICY "Members can view chase rounds"
  ON public.chase_rounds
  FOR SELECT
  USING (is_league_member(auth.uid(), league_id) OR is_league_owner(auth.uid(), league_id));

-- RLS policies for chase_eliminations  
CREATE POLICY "Members can view chase eliminations"
  ON public.chase_eliminations
  FOR SELECT
  USING (is_league_member(auth.uid(), league_id) OR is_league_owner(auth.uid(), league_id));