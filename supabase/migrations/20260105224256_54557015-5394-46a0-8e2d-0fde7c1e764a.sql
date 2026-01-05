-- Fix the join_league_by_invite_code function with proper table aliases
-- to resolve the "ambiguous column reference" error
CREATE OR REPLACE FUNCTION public.join_league_by_invite_code(_invite_code TEXT)
RETURNS TABLE (
  league_id UUID,
  league_name TEXT,
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _league_id UUID;
  _league_name TEXT;
  _user_id UUID;
BEGIN
  -- Get the authenticated user
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, FALSE, 'Not authenticated'::TEXT;
    RETURN;
  END IF;

  -- Find league by invite code (case-insensitive)
  -- Use table alias to avoid ambiguity with RETURNS TABLE columns
  SELECT l.id, l.name INTO _league_id, _league_name
  FROM public.leagues l
  WHERE UPPER(l.invite_code) = UPPER(TRIM(_invite_code));
  
  IF _league_id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, FALSE, 'Invalid invite code'::TEXT;
    RETURN;
  END IF;
  
  -- Check if already a member (use table alias)
  IF EXISTS (
    SELECT 1 FROM public.league_members lm 
    WHERE lm.league_id = _league_id AND lm.user_id = _user_id
  ) THEN
    RETURN QUERY SELECT _league_id, _league_name, FALSE, 'Already a member of this league'::TEXT;
    RETURN;
  END IF;
  
  -- Add user to league with ON CONFLICT for idempotence
  INSERT INTO public.league_members (league_id, user_id)
  VALUES (_league_id, _user_id)
  ON CONFLICT DO NOTHING;
  
  RETURN QUERY SELECT _league_id, _league_name, TRUE, 'Successfully joined league'::TEXT;
END;
$$;

-- Add unique constraint on league membership to prevent duplicates
ALTER TABLE public.league_members 
ADD CONSTRAINT league_members_unique_membership 
UNIQUE (league_id, user_id);

-- Add case-insensitive unique index on invite codes
CREATE UNIQUE INDEX IF NOT EXISTS leagues_invite_code_unique_upper 
ON public.leagues (UPPER(invite_code));