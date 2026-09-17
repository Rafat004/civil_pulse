-- Phase 3 Migration: Report Followers & Notifications

-- 1. Report Followers Table
CREATE TABLE IF NOT EXISTS public.report_followers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(report_id, user_id)
);

ALTER TABLE public.report_followers ENABLE ROW LEVEL SECURITY;

-- Restrict SELECT to user's own follow records for privacy
DROP POLICY IF EXISTS "Allow public read access to report_followers" ON public.report_followers;
DROP POLICY IF EXISTS "Allow users to read own report_followers" ON public.report_followers;
CREATE POLICY "Allow users to read own report_followers"
    ON public.report_followers FOR SELECT
    USING (auth.uid() = user_id);

-- Authenticated users follow only as themselves
DROP POLICY IF EXISTS "Allow users to follow reports" ON public.report_followers;
CREATE POLICY "Allow users to follow reports"
    ON public.report_followers FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Authenticated users unfollow only as themselves
DROP POLICY IF EXISTS "Allow users to unfollow reports" ON public.report_followers;
CREATE POLICY "Allow users to unfollow reports"
    ON public.report_followers FOR DELETE
    USING (auth.uid() = user_id);

-- Trusted function for safe public follower counts without exposing follower user IDs
CREATE OR REPLACE FUNCTION public.get_follower_count(p_report_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER 
    FROM public.report_followers 
    WHERE report_id = p_report_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_follower_count(UUID) TO anon, authenticated;

-- 2. Notifications Table
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

-- Users can read only their own notifications
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
CREATE POLICY "Users can read own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

-- Users can update only their own notification read_at state
DROP POLICY IF EXISTS "Users can update own notification read state" ON public.notifications;
CREATE POLICY "Users can update own notification read state"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Safeguard: Ensure users can ONLY modify read_at, not administrative/notification payload fields
CREATE OR REPLACE FUNCTION public.protect_notification_fields()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS check_notification_update_permissions ON public.notifications;
CREATE TRIGGER check_notification_update_permissions
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE PROCEDURE public.protect_notification_fields();

-- 3. Trusted Triggers for Notification Generation

-- Trigger A: Status Change & Resolution Notifications
CREATE OR REPLACE FUNCTION public.notify_report_status_change()
RETURNS trigger AS $$
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

    -- Insert notification for report author and all report followers (excluding actor)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_report_status_changed_notify ON public.reports;
CREATE TRIGGER on_report_status_changed_notify
  AFTER UPDATE ON public.reports
  FOR EACH ROW EXECUTE PROCEDURE public.notify_report_status_change();

-- Trigger B: New Comment & Official Update Notifications
CREATE OR REPLACE FUNCTION public.notify_new_comment()
RETURNS trigger AS $$
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

  -- Insert notifications for report author and all report followers (excluding commenter)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_created_notify ON public.comments;
CREATE TRIGGER on_comment_created_notify
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE PROCEDURE public.notify_new_comment();

-- 4. Supabase Realtime Setup for Phase 3
ALTER PUBLICATION supabase_realtime ADD TABLE public.report_followers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
