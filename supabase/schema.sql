-- Civic Pulse - Canonical Target Database Schema (Synchronized with Migrations 001-007)

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Wipe old tables to ensure a clean slate and remove old test data
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.report_followers CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.report_status_history CASCADE;
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
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Safe public_profiles view exposing only required identity fields
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT id, full_name, role
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 1. Create Departments Table
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Reported',
    zone TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    image_url TEXT,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    duplicate_of UUID REFERENCES public.reports(id) ON DELETE SET NULL,
    resolution_note TEXT,
    resolution_image_url TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT prevent_self_duplicate CHECK (duplicate_of IS NULL OR duplicate_of <> id)
);

-- 3. Report Security & Lifecycle Triggers

-- Protect administrative fields against unauthorized citizen edits
CREATE OR REPLACE FUNCTION public.protect_admin_report_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

DROP TRIGGER IF EXISTS check_report_update_permissions ON public.reports;
CREATE TRIGGER check_report_update_permissions
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE PROCEDURE public.protect_admin_report_fields();

-- Report Creation Normalization Trigger (Normalize INSERT fields for non-admin citizens)
CREATE OR REPLACE FUNCTION public.normalize_new_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT COALESCE((SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()), false) THEN
    NEW.status := 'Reported';
    NEW.department_id := NULL;
    NEW.duplicate_of := NULL;
    NEW.resolution_note := NULL;
    NEW.resolution_image_url := NULL;
    NEW.resolved_at := NULL;
    NEW.user_id := COALESCE(auth.uid(), NEW.user_id);
    NEW.created_at := NOW();
    NEW.updated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_report_before_insert ON public.reports;
CREATE TRIGGER on_report_before_insert
  BEFORE INSERT ON public.reports
  FOR EACH ROW EXECUTE PROCEDURE public.normalize_new_report();

-- Duplicate Integrity Trigger
CREATE OR REPLACE FUNCTION public.enforce_duplicate_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_status TEXT;
BEGIN
  IF NEW.status = 'Duplicate' THEN
    IF NEW.duplicate_of IS NULL THEN
      RAISE EXCEPTION 'Report marked as Duplicate must specify duplicate_of target.';
    END IF;

    IF NEW.duplicate_of = NEW.id THEN
      RAISE EXCEPTION 'A report cannot be marked as a duplicate of itself.';
    END IF;

    SELECT status INTO v_target_status FROM public.reports WHERE id = NEW.duplicate_of;

    IF v_target_status IS NULL THEN
      RAISE EXCEPTION 'Target duplicate report does not exist.';
    END IF;

    IF v_target_status IN ('Duplicate', 'Rejected') THEN
      RAISE EXCEPTION 'Target report cannot be in Duplicate or Rejected status.';
    END IF;
  ELSE
    NEW.duplicate_of := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_duplicate_integrity ON public.reports;
CREATE TRIGGER check_duplicate_integrity
  BEFORE INSERT OR UPDATE ON public.reports
  FOR EACH ROW EXECUTE PROCEDURE public.enforce_duplicate_integrity();

-- Status Metadata Cleanup Trigger (Reopen / Resolve semantics)
CREATE OR REPLACE FUNCTION public.handle_status_metadata_cleanup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'Reopened' THEN
      NEW.resolution_note := NULL;
      NEW.resolution_image_url := NULL;
      NEW.resolved_at := NULL;
    ELSIF NEW.status = 'Resolved' THEN
      NEW.resolved_at := NOW();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_report_status_metadata_cleanup ON public.reports;
CREATE TRIGGER on_report_status_metadata_cleanup
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE PROCEDURE public.handle_status_metadata_cleanup();

-- Safeguard: Enforce valid status transitions at database level for any report update
CREATE OR REPLACE FUNCTION public.validate_report_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

DROP TRIGGER IF EXISTS check_status_transition ON public.reports;
CREATE TRIGGER check_status_transition
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE PROCEDURE public.validate_report_status_transition();

-- 4. Create the Report Reactions Table
CREATE TABLE IF NOT EXISTS public.report_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('affected', 'confirmed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(report_id, user_id, type)
);

-- 5. Create Report Status History Table
CREATE TABLE IF NOT EXISTS public.report_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.report_status_history (report_id, from_status, to_status, changed_by, note)
  VALUES (new.id, NULL, new.status, new.user_id, 'Report submitted');
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_report_created ON public.reports;
CREATE TRIGGER on_report_created
  AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE PROCEDURE public.log_new_report_status_history();

-- Trigger to log status changes automatically in single transaction
CREATE OR REPLACE FUNCTION public.log_report_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

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
    p_resolution_image_url TEXT DEFAULT NULL,
    p_clear_department BOOLEAN DEFAULT FALSE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_old_status TEXT;
    v_is_admin BOOLEAN;
    v_target_status TEXT;
BEGIN
    SELECT (role = 'admin') INTO v_is_admin
    FROM public.profiles
    WHERE id = auth.uid();

    IF NOT COALESCE(v_is_admin, false) THEN
        RAISE EXCEPTION 'Only administrators can update report statuses.';
    END IF;

    SELECT status INTO v_old_status
    FROM public.reports
    WHERE id = p_report_id;

    IF v_old_status IS NULL THEN
        RAISE EXCEPTION 'Report not found.';
    END IF;

    IF p_new_status = 'Duplicate' THEN
        IF p_duplicate_of IS NULL THEN
            RAISE EXCEPTION 'Duplicate status requires a canonical target report.';
        END IF;

        IF p_duplicate_of = p_report_id THEN
            RAISE EXCEPTION 'A report cannot be marked as a duplicate of itself.';
        END IF;

        SELECT status INTO v_target_status
        FROM public.reports
        WHERE id = p_duplicate_of;

        IF v_target_status IS NULL THEN
            RAISE EXCEPTION 'Canonical target report not found.';
        END IF;

        IF v_target_status IN ('Duplicate', 'Rejected') THEN
            RAISE EXCEPTION 'Target report status cannot be Duplicate or Rejected.';
        END IF;
    END IF;

    IF p_note IS NOT NULL THEN
        PERFORM set_config('civicpulse.status_change_note', p_note, true);
    END IF;

    UPDATE public.reports
    SET
        status = p_new_status,
        updated_at = NOW(),
        department_id = CASE
            WHEN p_clear_department THEN NULL
            ELSE COALESCE(p_department_id, department_id)
        END,
        duplicate_of = CASE WHEN p_new_status = 'Duplicate' THEN p_duplicate_of ELSE NULL END,
        resolution_note = CASE
            WHEN p_new_status = 'Resolved' THEN COALESCE(p_resolution_note, resolution_note)
            WHEN p_new_status = 'Reopened' THEN NULL
            ELSE resolution_note
        END,
        resolution_image_url = CASE
            WHEN p_new_status = 'Resolved' THEN COALESCE(p_resolution_image_url, resolution_image_url)
            WHEN p_new_status = 'Reopened' THEN NULL
            ELSE resolution_image_url
        END,
        resolved_at = CASE
            WHEN p_new_status = 'Resolved' THEN NOW()
            WHEN p_new_status = 'Reopened' THEN NULL
            ELSE resolved_at
        END
    WHERE id = p_report_id;
END;
$$;

-- 8. Create Comments Table (Phase 2)
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Protect Comment Metadata Trigger
CREATE OR REPLACE FUNCTION public.protect_comment_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.id IS DISTINCT FROM NEW.id OR
     OLD.report_id IS DISTINCT FROM NEW.report_id OR
     OLD.user_id IS DISTINCT FROM NEW.user_id OR
     OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'Comment system fields (id, report_id, user_id, created_at) cannot be modified.';
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_comment_update ON public.comments;
CREATE TRIGGER check_comment_update
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE PROCEDURE public.protect_comment_metadata();

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

-- 9. Report Followers Table (Phase 3)
CREATE TABLE IF NOT EXISTS public.report_followers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(report_id, user_id)
);

ALTER TABLE public.report_followers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to report_followers" ON public.report_followers;
DROP POLICY IF EXISTS "Allow users to read own report_followers" ON public.report_followers;
CREATE POLICY "Allow users to read own report_followers"
    ON public.report_followers FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to follow reports" ON public.report_followers;
CREATE POLICY "Allow users to follow reports"
    ON public.report_followers FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to unfollow reports" ON public.report_followers;
CREATE POLICY "Allow users to unfollow reports"
    ON public.report_followers FOR DELETE
    USING (auth.uid() = user_id);

-- Trusted function for safe public follower counts without exposing follower user IDs
CREATE OR REPLACE FUNCTION public.get_follower_count(p_report_id UUID)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.report_followers
  WHERE report_id = p_report_id;

  RETURN COALESCE(v_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_follower_count(UUID) TO anon, authenticated;

-- 10. Notifications Table (Phase 3)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('STATUS_CHANGED', 'NEW_COMMENT', 'OFFICIAL_UPDATE', 'REPORT_RESOLVED', 'REPORT_REOPENED')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
CREATE POLICY "Users can read own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notification read state" ON public.notifications;
CREATE POLICY "Users can update own notification read state"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Safeguard: Ensure users can ONLY modify read_at, not administrative/notification payload fields
CREATE OR REPLACE FUNCTION public.protect_notification_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.user_id IS DISTINCT FROM NEW.user_id OR
     OLD.report_id IS DISTINCT FROM NEW.report_id OR
     OLD.type IS DISTINCT FROM NEW.type OR
     OLD.title IS DISTINCT FROM NEW.title OR
     OLD.message IS DISTINCT FROM NEW.message OR
     OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'Users are permitted to update only the read_at field of notifications.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_notification_update_permissions ON public.notifications;
CREATE TRIGGER check_notification_update_permissions
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE PROCEDURE public.protect_notification_fields();

-- 11. Trusted Triggers for Notification Generation

CREATE OR REPLACE FUNCTION public.notify_report_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type TEXT;
  v_title TEXT;
  v_message TEXT;
  v_actor_id UUID;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_actor_id := auth.uid();

    IF NEW.status = 'Resolved' THEN
      v_type := 'REPORT_RESOLVED';
      v_title := 'Report Resolved';
      v_message := 'Report "' || NEW.title || '" has been resolved.';
    ELSIF NEW.status = 'Reopened' THEN
      v_type := 'REPORT_REOPENED';
      v_title := 'Report Reopened';
      v_message := 'Report "' || NEW.title || '" has been reopened.';
    ELSE
      v_type := 'STATUS_CHANGED';
      v_title := 'Report Status Updated';
      v_message := 'Report "' || NEW.title || '" status changed from ' || OLD.status || ' to ' || NEW.status || '.';
    END IF;

    INSERT INTO public.notifications (user_id, report_id, type, title, message)
    SELECT DISTINCT target_user_id, NEW.id, v_type, v_title, v_message
    FROM (
      SELECT user_id AS target_user_id FROM public.reports WHERE id = NEW.id
      UNION
      SELECT user_id AS target_user_id FROM public.report_followers WHERE report_id = NEW.id
    ) targets
    WHERE target_user_id IS NOT NULL 
      AND (v_actor_id IS NULL OR target_user_id <> v_actor_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_report_status_changed_notify ON public.reports;
CREATE TRIGGER on_report_status_changed_notify
  AFTER UPDATE ON public.reports
  FOR EACH ROW EXECUTE PROCEDURE public.notify_report_status_change();

CREATE OR REPLACE FUNCTION public.notify_new_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report_title TEXT;
  v_author_role TEXT;
  v_type TEXT;
  v_title TEXT;
  v_message TEXT;
BEGIN
  SELECT title INTO v_report_title FROM public.reports WHERE id = NEW.report_id;
  SELECT role INTO v_author_role FROM public.profiles WHERE id = NEW.user_id;

  IF v_author_role = 'admin' THEN
    v_type := 'OFFICIAL_UPDATE';
    v_title := 'Official Update on Report';
    v_message := 'An official update was posted on "' || COALESCE(v_report_title, 'Report') || '".';
  ELSE
    v_type := 'NEW_COMMENT';
    v_title := 'New Comment on Report';
    v_message := 'A new comment was posted on "' || COALESCE(v_report_title, 'Report') || '".';
  END IF;

  INSERT INTO public.notifications (user_id, report_id, type, title, message)
  SELECT DISTINCT target_user_id, NEW.report_id, v_type, v_title, v_message
  FROM (
    SELECT user_id AS target_user_id FROM public.reports WHERE id = NEW.report_id
    UNION
    SELECT user_id AS target_user_id FROM public.report_followers WHERE report_id = NEW.report_id
  ) targets
  WHERE target_user_id IS NOT NULL 
    AND target_user_id <> NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_comment_created_notify ON public.comments;
CREATE TRIGGER on_comment_created_notify
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE PROCEDURE public.notify_new_comment();

-- 12. Supabase Realtime Setup
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.report_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.departments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.report_status_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.report_followers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 13. Storage Bucket 'reports' & RLS Policies (Post-Audit Hardening)
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Read Access for Reports Bucket" ON storage.objects;
CREATE POLICY "Public Read Access for Reports Bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'reports');

DROP POLICY IF EXISTS "Authenticated User Folder Upload for Reports Bucket" ON storage.objects;
CREATE POLICY "Authenticated User Folder Upload for Reports Bucket"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'reports' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "User or Admin Manage Files for Reports Bucket" ON storage.objects;
CREATE POLICY "User or Admin Manage Files for Reports Bucket"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'reports' AND
    (
      (storage.foldername(name))[1] = auth.uid()::text OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

DROP POLICY IF EXISTS "User or Admin Delete Files for Reports Bucket" ON storage.objects;
CREATE POLICY "User or Admin Delete Files for Reports Bucket"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'reports' AND
    (
      (storage.foldername(name))[1] = auth.uid()::text OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );
