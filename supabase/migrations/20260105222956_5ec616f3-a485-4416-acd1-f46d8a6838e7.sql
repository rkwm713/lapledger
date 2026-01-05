-- Create a secure function to join leagues by invite code
-- This bypasses RLS safely to look up leagues by invite code
CREATE OR REPLACE FUNCTION public.join_league_by_invite_code(
  _invite_code TEXT
)
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
  SELECT id, name INTO _league_id, _league_name
  FROM public.leagues
  WHERE UPPER(invite_code) = UPPER(TRIM(_invite_code));
  
  IF _league_id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, FALSE, 'Invalid invite code'::TEXT;
    RETURN;
  END IF;
  
  -- Check if already a member
  IF EXISTS (
    SELECT 1 FROM public.league_members 
    WHERE league_id = _league_id AND user_id = _user_id
  ) THEN
    RETURN QUERY SELECT _league_id, _league_name, FALSE, 'Already a member of this league'::TEXT;
    RETURN;
  END IF;
  
  -- Add user to league
  INSERT INTO public.league_members (league_id, user_id)
  VALUES (_league_id, _user_id);
  
  RETURN QUERY SELECT _league_id, _league_name, TRUE, 'Successfully joined league'::TEXT;
END;
$$;