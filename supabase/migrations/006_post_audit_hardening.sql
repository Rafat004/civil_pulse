-- Phase 4 Post-Audit Hardening Migration

-- 1. Storage bucket 'reports' & RLS policies
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

-- 2. Report Creation Security (Normalize INSERT fields for non-admin citizens)
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
    NEW.upvotes_count := 0;
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
  FOR EACH ROW
  EXECUTE PROCEDURE public.normalize_new_report();

-- 3. Cross-row Duplicate Integrity Trigger
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
  FOR EACH ROW
  EXECUTE PROCEDURE public.enforce_duplicate_integrity();

-- 4. Status Metadata Cleanup Trigger (Reopen / Resolve semantics)
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
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_status_metadata_cleanup();

-- 5. Comment Column Protection Trigger
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
  FOR EACH ROW
  EXECUTE PROCEDURE public.protect_comment_metadata();

-- 6. Hardened RPC with Department Unassignment & Reopen/Resolve metadata
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

-- 7. SECURITY DEFINER search_path hardening for all project functions
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

CREATE OR REPLACE FUNCTION public.protect_notification_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.id IS DISTINCT FROM NEW.id OR
     OLD.user_id IS DISTINCT FROM NEW.user_id OR
     OLD.report_id IS DISTINCT FROM NEW.report_id OR
     OLD.type IS DISTINCT FROM NEW.type OR
     OLD.title IS DISTINCT FROM NEW.title OR
     OLD.message IS DISTINCT FROM NEW.message OR
     OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'Users may only modify read_at on notifications.';
  END IF;

  RETURN NEW;
END;
$$;

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
