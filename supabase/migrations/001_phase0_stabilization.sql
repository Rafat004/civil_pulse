-- Phase 0 Stabilization Migration
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'civic',
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

-- 1. Secure Signup (Always default role to 'civic', ignore user metadata role)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    new.id,
    'civic',
    new.raw_user_meta_data->>'full_name'
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      role = 'civic';
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Reports Table & RLS Policies
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Reported',
    zone TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    upvotes_count INTEGER NOT NULL DEFAULT 0,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to reports" ON public.reports;
CREATE POLICY "Allow public read access to reports"
    ON public.reports FOR SELECT
    USING (true);

-- Allow authenticated users to insert reports (enforcing user_id = auth.uid())
DROP POLICY IF EXISTS "Allow authenticated inserts on reports" ON public.reports;
CREATE POLICY "Allow authenticated inserts on reports"
    ON public.reports FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Allow Citizens to edit only their own reports while status is 'Reported'
DROP POLICY IF EXISTS "Allow citizens to edit own reported reports" ON public.reports;
CREATE POLICY "Allow citizens to edit own reported reports"
    ON public.reports FOR UPDATE
    USING (auth.uid() = user_id AND status = 'Reported')
    WITH CHECK (auth.uid() = user_id AND status = 'Reported');

-- Allow Admins to update any report
DROP POLICY IF EXISTS "Allow admins to update reports" ON public.reports;
CREATE POLICY "Allow admins to update reports"
    ON public.reports FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
      )
    );

-- 3. Persistent Civic Reactions (report_reactions)
CREATE TABLE IF NOT EXISTS public.report_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('affected', 'confirmed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(report_id, user_id, type)
);

ALTER TABLE public.report_reactions ENABLE ROW LEVEL SECURITY;

-- Read reactions (public)
DROP POLICY IF EXISTS "Allow public read access to report_reactions" ON public.report_reactions;
CREATE POLICY "Allow public read access to report_reactions"
    ON public.report_reactions FOR SELECT
    USING (true);

-- Insert reaction (authenticated owner)
DROP POLICY IF EXISTS "Allow authenticated inserts on report_reactions" ON public.report_reactions;
CREATE POLICY "Allow authenticated inserts on report_reactions"
    ON public.report_reactions FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Delete reaction (authenticated owner)
DROP POLICY IF EXISTS "Allow users to delete own report_reactions" ON public.report_reactions;
CREATE POLICY "Allow users to delete own report_reactions"
    ON public.report_reactions FOR DELETE
    USING (auth.uid() = user_id);

-- Enable Realtime for report_reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.report_reactions;
