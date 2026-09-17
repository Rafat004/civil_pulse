-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Wipe old tables to ensure a clean slate and remove old test data
DROP TABLE IF EXISTS public.report_status_history CASCADE;
DROP TABLE IF EXISTS public.upvotes CASCADE;
DROP TABLE IF EXISTS public.report_reactions CASCADE;
DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 0. Create Profiles Table (for RBAC)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'civic',
    full_name TEXT,
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

-- Safe public_profiles view exposing only required identity fields
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT id, full_name, role
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Trusted SQL method to promote demo admin account:
-- UPDATE public.profiles SET role = 'admin' WHERE id = '<user_uuid>';

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 1. Create Departments Table
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to departments" ON public.departments;
CREATE POLICY "Allow public read access to departments"
    ON public.departments FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow admins to manage departments" ON public.departments;
CREATE POLICY "Allow admins to manage departments"
    ON public.departments FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
      )
    );

-- Seed EXACT documented departments from DATABASE.md
INSERT INTO public.departments (name, description)
VALUES 
    ('Roads & Infrastructure', 'Potholes, damaged roads, sidewalks, bridges, and structural hazards'),
    ('Waste Management', 'Trash collection, illegal dumping, street cleaning, and public bins'),
    ('Water & Drainage', 'Water leaks, pipe bursts, drainage blockages, and sewage issues'),
    ('Electricity & Lighting', 'Broken streetlights, exposed wiring, and power infrastructure'),
    ('Public Safety', 'Hazardous public structures, emergency hazards, and safety concerns'),
    ('Parks & Public Spaces', 'Park maintenance, fallen trees, overgrown vegetation, and public green spaces')
ON CONFLICT (name) DO NOTHING;

-- 2. Create the Reports Table
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
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    duplicate_of UUID REFERENCES public.reports(id) ON DELETE SET NULL,
    resolution_note TEXT,
    resolution_image_url TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Database Safeguard: Prevent non-admins from modifying administrative / system fields
CREATE OR REPLACE FUNCTION public.protect_admin_report_fields()
RETURNS trigger AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  SELECT (role = 'admin') INTO v_is_admin
  FROM public.profiles
  WHERE id = auth.uid();

  IF NOT COALESCE(v_is_admin, false) THEN
    IF OLD.status IS DISTINCT FROM NEW.status OR
       OLD.department_id IS DISTINCT FROM NEW.department_id OR
       OLD.duplicate_of IS DISTINCT FROM NEW.duplicate_of OR
       OLD.resolution_note IS DISTINCT FROM NEW.resolution_note OR
       OLD.resolution_image_url IS DISTINCT FROM NEW.resolution_image_url OR
       OLD.resolved_at IS DISTINCT FROM NEW.resolved_at OR
       OLD.user_id IS DISTINCT FROM NEW.user_id OR
       OLD.created_at IS DISTINCT FROM NEW.created_at THEN
      RAISE EXCEPTION 'Citizens are not permitted to modify administrative or system fields.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS check_report_update_permissions ON public.reports;
CREATE TRIGGER check_report_update_permissions
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE PROCEDURE public.protect_admin_report_fields();

-- Safeguard: Enforce valid status transitions at database level for any report update
CREATE OR REPLACE FUNCTION public.validate_report_status_transition()
RETURNS trigger AS $$
DECLARE
  v_valid BOOLEAN := FALSE;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF (OLD.status = 'Reported' AND NEW.status IN ('Verified', 'Rejected', 'Duplicate')) OR
       (OLD.status = 'Verified' AND NEW.status IN ('Assigned', 'Duplicate')) OR
       (OLD.status = 'Assigned' AND NEW.status IN ('In Progress')) OR
       (OLD.status = 'In Progress' AND NEW.status IN ('Resolved')) OR
       (OLD.status = 'Resolved' AND NEW.status IN ('Reopened')) OR
       (OLD.status = 'Reopened' AND NEW.status IN ('In Progress')) THEN
      v_valid := TRUE;
    END IF;

    IF NOT v_valid THEN
      RAISE EXCEPTION 'Invalid status transition from % to %.', OLD.status, NEW.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS check_status_transition ON public.reports;
CREATE TRIGGER check_status_transition
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE PROCEDURE public.validate_report_status_transition();

-- 4. Create the Report Reactions Table
CREATE TABLE IF NOT EXISTS public.report_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('affected', 'confirmed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(report_id, user_id, type)
);

-- 5. Create Report Status History Table
CREATE TABLE IF NOT EXISTS public.report_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.report_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to report_status_history" ON public.report_status_history;
CREATE POLICY "Allow public read access to report_status_history"
    ON public.report_status_history FOR SELECT
    USING (true);

-- History must be written only by trusted database triggers/functions
DROP POLICY IF EXISTS "Allow authenticated inserts on report_status_history" ON public.report_status_history;

-- Trigger to log initial 'Reported' status history entry upon report creation
CREATE OR REPLACE FUNCTION public.log_new_report_status_history()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.report_status_history (report_id, from_status, to_status, changed_by, note)
  VALUES (new.id, NULL, new.status, new.user_id, 'Report submitted');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_report_created ON public.reports;
CREATE TRIGGER on_report_created
  AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE PROCEDURE public.log_new_report_status_history();

-- Trigger to log status changes automatically in single transaction
CREATE OR REPLACE FUNCTION public.log_report_status_change()
RETURNS trigger AS $$
DECLARE
  v_note TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    BEGIN
      v_note := current_setting('civicpulse.status_change_note', true);
    EXCEPTION WHEN OTHERS THEN
      v_note := NULL;
    END;

    INSERT INTO public.report_status_history (report_id, from_status, to_status, changed_by, note)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), v_note);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_report_status_changed ON public.reports;
CREATE TRIGGER on_report_status_changed
  AFTER UPDATE ON public.reports
  FOR EACH ROW EXECUTE PROCEDURE public.log_report_status_change();

-- 6. Row Level Security (RLS) for Reports and Reactions
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

-- 7. Trusted RPC Function for Admin Status Changes with Transition Validation
CREATE OR REPLACE FUNCTION public.change_report_status(
    p_report_id UUID,
    p_new_status TEXT,
    p_note TEXT DEFAULT NULL,
    p_department_id UUID DEFAULT NULL,
    p_duplicate_of UUID DEFAULT NULL,
    p_resolution_note TEXT DEFAULT NULL,
    p_resolution_image_url TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    v_old_status TEXT;
    v_is_admin BOOLEAN;
BEGIN
    -- Check admin permission
    SELECT (role = 'admin') INTO v_is_admin
    FROM public.profiles
    WHERE id = auth.uid();

    IF NOT COALESCE(v_is_admin, false) THEN
        RAISE EXCEPTION 'Only administrators can update report statuses.';
    END IF;

    -- Fetch current status
    SELECT status INTO v_old_status
    FROM public.reports
    WHERE id = p_report_id;

    IF v_old_status IS NULL THEN
        RAISE EXCEPTION 'Report not found.';
    END IF;

    -- Set session variable for history note
    IF p_note IS NOT NULL THEN
        PERFORM set_config('civicpulse.status_change_note', p_note, true);
    END IF;

    -- Update report fields (triggers validate transition & log status history)
    UPDATE public.reports
    SET 
        status = p_new_status,
        updated_at = NOW(),
        department_id = COALESCE(p_department_id, department_id),
        duplicate_of = COALESCE(p_duplicate_of, duplicate_of),
        resolution_note = CASE WHEN p_new_status = 'Resolved' THEN COALESCE(p_resolution_note, resolution_note) ELSE resolution_note END,
        resolution_image_url = CASE WHEN p_new_status = 'Resolved' THEN COALESCE(p_resolution_image_url, resolution_image_url) ELSE resolution_image_url END,
        resolved_at = CASE WHEN p_new_status = 'Resolved' THEN COALESCE(resolved_at, NOW()) ELSE resolved_at END
    WHERE id = p_report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create Comments Table (Phase 2)
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Read comments (public)
DROP POLICY IF EXISTS "Allow public read access to comments" ON public.comments;
CREATE POLICY "Allow public read access to comments"
    ON public.comments FOR SELECT
    USING (true);

-- Insert comments (authenticated users as self)
DROP POLICY IF EXISTS "Allow authenticated inserts on comments" ON public.comments;
CREATE POLICY "Allow authenticated inserts on comments"
    ON public.comments FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Update comments (comment author or admin)
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

-- Delete comments (comment author or admin)
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

-- 9. Supabase Realtime Setup
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.report_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.departments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.report_status_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;

