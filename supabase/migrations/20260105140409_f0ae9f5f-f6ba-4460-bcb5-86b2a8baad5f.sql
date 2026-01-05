-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create leagues table
CREATE TABLE public.leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  season INTEGER NOT NULL DEFAULT 2025,
  series TEXT NOT NULL DEFAULT 'cup',
  invite_code TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create league_members table
CREATE TABLE public.league_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (league_id, user_id)
);

-- Create driver_picks table
CREATE TABLE public.driver_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  driver_id INTEGER NOT NULL,
  driver_name TEXT NOT NULL,
  car_number TEXT,
  team_name TEXT,
  pick_order INTEGER NOT NULL CHECK (pick_order IN (1, 2)),
  season INTEGER NOT NULL,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (league_id, user_id, pick_order, season)
);

-- Create race_scores table (cached NASCAR data)
CREATE TABLE public.race_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id INTEGER NOT NULL,
  season INTEGER NOT NULL,
  series TEXT NOT NULL,
  race_name TEXT NOT NULL,
  race_date TIMESTAMPTZ NOT NULL,
  driver_id INTEGER NOT NULL,
  driver_name TEXT NOT NULL,
  finishing_position INTEGER,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (race_id, driver_id)
);

-- Create user_race_scores table
CREATE TABLE public.user_race_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  race_id INTEGER NOT NULL,
  driver_1_points INTEGER DEFAULT 0,
  driver_2_points INTEGER DEFAULT 0,
  total_points INTEGER GENERATED ALWAYS AS (driver_1_points + driver_2_points) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (league_id, user_id, race_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.race_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_race_scores ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check league membership
CREATE OR REPLACE FUNCTION public.is_league_member(_user_id UUID, _league_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.league_members
    WHERE user_id = _user_id
      AND league_id = _league_id
  )
$$;

-- Function to check league ownership
CREATE OR REPLACE FUNCTION public.is_league_owner(_user_id UUID, _league_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.leagues
    WHERE id = _league_id
      AND owner_id = _user_id
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Leagues policies
CREATE POLICY "Members can view their leagues" ON public.leagues
  FOR SELECT TO authenticated 
  USING (public.is_league_member(auth.uid(), id) OR owner_id = auth.uid());

CREATE POLICY "Authenticated users can create leagues" ON public.leagues
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their leagues" ON public.leagues
  FOR UPDATE TO authenticated USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their leagues" ON public.leagues
  FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- League members policies
CREATE POLICY "Members can view league members" ON public.league_members
  FOR SELECT TO authenticated 
  USING (public.is_league_member(auth.uid(), league_id) OR public.is_league_owner(auth.uid(), league_id));

CREATE POLICY "Users can join leagues" ON public.league_members
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave leagues" ON public.league_members
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.is_league_owner(auth.uid(), league_id));

-- Driver picks policies
CREATE POLICY "Members can view picks in their leagues" ON public.driver_picks
  FOR SELECT TO authenticated 
  USING (public.is_league_member(auth.uid(), league_id));

CREATE POLICY "Users can create their own picks" ON public.driver_picks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND public.is_league_member(auth.uid(), league_id));

CREATE POLICY "Users can update their own unlocked picks" ON public.driver_picks
  FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id AND locked_at IS NULL);

CREATE POLICY "Users can delete their own unlocked picks" ON public.driver_picks
  FOR DELETE TO authenticated 
  USING (auth.uid() = user_id AND locked_at IS NULL);

-- Race scores policies (public read for all authenticated users)
CREATE POLICY "Authenticated users can view race scores" ON public.race_scores
  FOR SELECT TO authenticated USING (true);

-- User race scores policies
CREATE POLICY "Members can view scores in their leagues" ON public.user_race_scores
  FOR SELECT TO authenticated 
  USING (public.is_league_member(auth.uid(), league_id));

-- Handle new user signup - create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();