-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Wipe old tables to ensure a clean slate and remove old test data
DROP TABLE IF EXISTS public.upvotes CASCADE;
DROP TABLE IF EXISTS public.report_reactions CASCADE;
DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 0. Create Profiles Table (for RBAC)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'civic',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

-- Trigger to create a profile automatically on signup (enforcing civic role)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (
    new.id,
    'civic'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trusted SQL method to promote demo admin account:
-- UPDATE public.profiles SET role = 'admin' WHERE id = '<user_uuid>';

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 1. Create the Reports Table
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create the Report Reactions Table
CREATE TABLE IF NOT EXISTS public.report_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('affected', 'confirmed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(report_id, user_id, type)
);

-- 3. Row Level Security (RLS)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_reactions ENABLE ROW LEVEL SECURITY;

-- Everyone can read reports and report_reactions
DROP POLICY IF EXISTS "Allow public read access to reports" ON public.reports;
CREATE POLICY "Allow public read access to reports"
    ON public.reports FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow public read access to report_reactions" ON public.report_reactions;
CREATE POLICY "Allow public read access to report_reactions"
    ON public.report_reactions FOR SELECT
    USING (true);

-- Authenticated users can insert reports (enforcing user_id = auth.uid())
DROP POLICY IF EXISTS "Allow authenticated inserts on reports" ON public.reports;
CREATE POLICY "Allow authenticated inserts on reports"
    ON public.reports FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Citizens may edit only their own reports while status is 'Reported'
DROP POLICY IF EXISTS "Allow citizens to edit own reported reports" ON public.reports;
CREATE POLICY "Allow citizens to edit own reported reports"
    ON public.reports FOR UPDATE
    USING (auth.uid() = user_id AND status = 'Reported')
    WITH CHECK (auth.uid() = user_id AND status = 'Reported');

-- Only Admins can UPDATE any report
DROP POLICY IF EXISTS "Allow admins to update reports" ON public.reports;
CREATE POLICY "Allow admins to update reports"
    ON public.reports FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
      )
    );

-- Authenticated users can insert report_reactions
DROP POLICY IF EXISTS "Allow authenticated inserts on report_reactions" ON public.report_reactions;
CREATE POLICY "Allow authenticated inserts on report_reactions"
    ON public.report_reactions FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Authenticated users can delete own report_reactions
DROP POLICY IF EXISTS "Allow users to delete own report_reactions" ON public.report_reactions;
CREATE POLICY "Allow users to delete own report_reactions"
    ON public.report_reactions FOR DELETE
    USING (auth.uid() = user_id);

-- 4. Supabase Realtime Setup
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.report_reactions;



