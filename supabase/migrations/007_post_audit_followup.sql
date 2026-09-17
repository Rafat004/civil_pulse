-- Migration 007: Post-Audit Followup
-- Safely drop obsolete 7-argument change_report_status function signature to resolve ambiguity
DROP FUNCTION IF EXISTS public.change_report_status(UUID, TEXT, TEXT, UUID, UUID, TEXT, TEXT);
