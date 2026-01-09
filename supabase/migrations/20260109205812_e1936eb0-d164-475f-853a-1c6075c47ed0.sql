-- Add is_admin column to league_members
ALTER TABLE public.league_members 
ADD COLUMN is_admin boolean NOT NULL DEFAULT false;

-- Create function to check if user is a league admin
CREATE OR REPLACE FUNCTION public.is_league_admin(_user_id uuid, _league_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.league_members
    WHERE user_id = _user_id
      AND league_id = _league_id
      AND is_admin = true
  )
$$;

-- Create combined permission check function (owner OR admin)
CREATE OR REPLACE FUNCTION public.can_manage_league(_user_id uuid, _league_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    public.is_league_owner(_user_id, _league_id) 
    OR public.is_league_admin(_user_id, _league_id)
  )
$$;

-- Update RLS policies to use can_manage_league() instead of is_league_owner()

-- league_members: Allow admins to update payment status
DROP POLICY IF EXISTS "Owners can update member payment status" ON public.league_members;
CREATE POLICY "Managers can update member payment status" 
ON public.league_members 
FOR UPDATE 
USING (public.can_manage_league(auth.uid(), league_id))
WITH CHECK (public.can_manage_league(auth.uid(), league_id));

-- league_settings: Allow admins to manage settings
DROP POLICY IF EXISTS "Owners can update league settings" ON public.league_settings;
CREATE POLICY "Managers can update league settings" 
ON public.league_settings 
FOR UPDATE 
USING (public.can_manage_league(auth.uid(), league_id))
WITH CHECK (public.can_manage_league(auth.uid(), league_id));

DROP POLICY IF EXISTS "Owners can insert league settings" ON public.league_settings;
CREATE POLICY "Managers can insert league settings" 
ON public.league_settings 
FOR INSERT 
WITH CHECK (public.can_manage_league(auth.uid(), league_id));

DROP POLICY IF EXISTS "Owners can delete league settings" ON public.league_settings;
CREATE POLICY "Managers can delete league settings" 
ON public.league_settings 
FOR DELETE 
USING (public.can_manage_league(auth.uid(), league_id));

-- free_pick_races: Allow admins to manage free pick races
DROP POLICY IF EXISTS "Owners can insert free pick races" ON public.free_pick_races;
CREATE POLICY "Managers can insert free pick races" 
ON public.free_pick_races 
FOR INSERT 
WITH CHECK (public.can_manage_league(auth.uid(), league_id));

DROP POLICY IF EXISTS "Owners can delete free pick races" ON public.free_pick_races;
CREATE POLICY "Managers can delete free pick races" 
ON public.free_pick_races 
FOR DELETE 
USING (public.can_manage_league(auth.uid(), league_id));