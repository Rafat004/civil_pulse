-- Phase 4 Hardening Migration: Duplicate Validation & Constraints

-- 1. Database safeguard preventing self-duplication
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS prevent_self_duplicate;
ALTER TABLE public.reports ADD CONSTRAINT prevent_self_duplicate CHECK (duplicate_of IS NULL OR duplicate_of <> id);

-- 2. Hardened change_report_status RPC function
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
    v_target_status TEXT;
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

    -- Validate duplicate status target
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
