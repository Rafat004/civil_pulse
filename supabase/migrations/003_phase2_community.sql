-- Phase 2 Community Migration: Comments Table, RLS & Safe Public Profiles

-- 1. Comments Table
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Comments RLS Policies
DROP POLICY IF EXISTS "Allow public read access to comments" ON public.comments;
CREATE POLICY "Allow public read access to comments"
    ON public.comments FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow authenticated inserts on comments" ON public.comments;
CREATE POLICY "Allow authenticated inserts on comments"
    ON public.comments FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users or admins to update comments" ON public.comments;
CREATE POLICY "Allow users or admins to update comments"
    ON public.comments FOR UPDATE
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Allow users or admins to delete comments" ON public.comments;
CREATE POLICY "Allow users or admins to delete comments"
    ON public.comments FOR DELETE
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 2. Profile metadata enhancements for safe public comment/report attribution
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Update handle_new_user to copy safe full_name while forcing role = 'civic'
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

-- Backfill existing profiles from raw_user_meta_data
UPDATE public.profiles p
SET full_name = u.raw_user_meta_data->>'full_name'
FROM auth.users u
WHERE p.id = u.id AND (p.full_name IS NULL OR p.full_name = '');

-- Safe public_profiles view exposing only required identity fields
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT id, full_name, role
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Realtime replication for comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
