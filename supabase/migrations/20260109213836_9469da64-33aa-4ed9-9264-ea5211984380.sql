-- Add public read-only access for the DEMO league
-- These policies allow anyone to view data in the demo league but not modify it

-- Public can view the demo league
CREATE POLICY "Public can view demo league" 
ON public.leagues 
FOR SELECT 
USING (name = 'DEMO');

-- Public can view demo league members
CREATE POLICY "Public can view demo league members" 
ON public.league_members 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM leagues 
    WHERE leagues.id = league_members.league_id 
    AND leagues.name = 'DEMO'
  )
);

-- Public can view demo league settings
CREATE POLICY "Public can view demo league settings" 
ON public.league_settings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM leagues 
    WHERE leagues.id = league_settings.league_id 
    AND leagues.name = 'DEMO'
  )
);

-- Public can view demo league picks
CREATE POLICY "Public can view demo league picks" 
ON public.driver_picks 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM leagues 
    WHERE leagues.id = driver_picks.league_id 
    AND leagues.name = 'DEMO'
  )
);

-- Public can view demo league user race scores
CREATE POLICY "Public can view demo league scores" 
ON public.user_race_scores 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM leagues 
    WHERE leagues.id = user_race_scores.league_id 
    AND leagues.name = 'DEMO'
  )
);

-- Public can view demo league season standings
CREATE POLICY "Public can view demo league standings" 
ON public.user_season_standings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM leagues 
    WHERE leagues.id = user_season_standings.league_id 
    AND leagues.name = 'DEMO'
  )
);

-- Public can view demo league chase rounds
CREATE POLICY "Public can view demo chase rounds" 
ON public.chase_rounds 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM leagues 
    WHERE leagues.id = chase_rounds.league_id 
    AND leagues.name = 'DEMO'
  )
);

-- Public can view demo league chase eliminations
CREATE POLICY "Public can view demo chase eliminations" 
ON public.chase_eliminations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM leagues 
    WHERE leagues.id = chase_eliminations.league_id 
    AND leagues.name = 'DEMO'
  )
);

-- Public can view demo league free pick races
CREATE POLICY "Public can view demo free pick races" 
ON public.free_pick_races 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM leagues 
    WHERE leagues.id = free_pick_races.league_id 
    AND leagues.name = 'DEMO'
  )
);