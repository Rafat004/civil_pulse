-- Phase 7 cleanup: report_reactions is the sole civic interaction model.
-- This removes the unused pre-Phase-0 vote table and cached counter.
DROP TABLE IF EXISTS public.upvotes CASCADE;
ALTER TABLE public.reports DROP COLUMN IF EXISTS upvotes_count;

-- The Phase 4 insert trigger predates report_reactions and attempted to write
-- the removed cached counter. Recreate it without that legacy assignment so
-- report inserts continue to work after this migration.
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
