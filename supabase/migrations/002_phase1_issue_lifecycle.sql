-- Phase 1 Issue Lifecycle Migration

-- 1. Departments Table
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

-- 2. Update Reports Table with Phase 1 fields
ALTER TABLE public.reports 
    ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS duplicate_of UUID REFERENCES public.reports(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS resolution_note TEXT,
    ADD COLUMN IF NOT EXISTS resolution_image_url TEXT,
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

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

-- 4. Report Status History Table
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

-- 5. Trusted RPC Function for Admin Status Changes with Transition Validation
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

-- Realtime replication for report_status_history
ALTER PUBLICATION supabase_realtime ADD TABLE public.report_status_history;
