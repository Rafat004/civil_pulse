-- Phase 0 Stabilization Migration
-- 1. Secure Signup (Always default role to 'civic', ignore user metadata role)
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

-- 2. Report RLS Policies
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
