-- Civic Pulse demo fixture. Run after applying schema.sql/migrations and creating
-- the two Auth users documented in docs/DEMO_RUNBOOK.md.
-- This script contains no passwords and only resets its fixed demo UUIDs.
BEGIN;

CREATE TEMP TABLE civicpulse_demo_users ON COMMIT DROP AS
SELECT
  (SELECT id FROM auth.users WHERE lower(email) = 'citizen.demo@civicpulse.test' LIMIT 1) AS citizen_id,
  (SELECT id FROM auth.users WHERE lower(email) = 'admin.demo@civicpulse.test' LIMIT 1) AS admin_id;

DO $$
BEGIN
  IF (SELECT citizen_id FROM civicpulse_demo_users) IS NULL
     OR (SELECT admin_id FROM civicpulse_demo_users) IS NULL THEN
    RAISE EXCEPTION 'Create citizen.demo@civicpulse.test and admin.demo@civicpulse.test in Supabase Auth before running this fixture.';
  END IF;
END $$;

UPDATE public.profiles
SET full_name = 'Civic Pulse Citizen', role = 'civic'
WHERE id = (SELECT citizen_id FROM civicpulse_demo_users);

UPDATE public.profiles
SET full_name = 'Civic Pulse Administrator', role = 'admin'
WHERE id = (SELECT admin_id FROM civicpulse_demo_users);

-- Make auth.uid() resolve to the trusted demo administrator for the workflow RPCs.
SELECT set_config('request.jwt.claim.sub', (SELECT admin_id::text FROM civicpulse_demo_users), true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', (SELECT admin_id::text FROM civicpulse_demo_users), 'role', 'authenticated')::text,
  true
);

INSERT INTO public.departments (name, description) VALUES
  ('Roads & Infrastructure', 'Potholes, damaged roads, sidewalks, bridges, and structural hazards'),
  ('Waste Management', 'Trash collection, illegal dumping, street cleaning, and public bins'),
  ('Water & Drainage', 'Water leaks, pipe bursts, drainage blockages, and sewage issues'),
  ('Electricity & Lighting', 'Broken streetlights, exposed wiring, and power infrastructure'),
  ('Public Safety', 'Hazardous public structures, emergency hazards, and safety concerns'),
  ('Parks & Public Spaces', 'Park maintenance, fallen trees, overgrown vegetation, and public green spaces')
ON CONFLICT (name) DO NOTHING;

-- Remove only records owned by this fixture so reruns are deterministic.
DELETE FROM public.notifications WHERE report_id IN (
  '11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444','55555555-5555-4555-8555-555555555555','66666666-6666-4666-8666-666666666666'
);
DELETE FROM public.comments WHERE report_id IN (
  '11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444','55555555-5555-4555-8555-555555555555','66666666-6666-4666-8666-666666666666'
);
DELETE FROM public.report_reactions WHERE report_id IN (
  '11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444','55555555-5555-4555-8555-555555555555','66666666-6666-4666-8666-666666666666'
);
DELETE FROM public.report_followers WHERE report_id IN (
  '11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444','55555555-5555-4555-8555-555555555555','66666666-6666-4666-8666-666666666666'
);
DELETE FROM public.report_status_history WHERE report_id IN (
  '11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444','55555555-5555-4555-8555-555555555555','66666666-6666-4666-8666-666666666666'
);
DELETE FROM public.reports WHERE id IN (
  '11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444','55555555-5555-4555-8555-555555555555','66666666-6666-4666-8666-666666666666'
);

INSERT INTO public.reports (id, user_id, title, description, category, status, zone, lat, lng, image_url)
VALUES
  ('11111111-1111-4111-8111-111111111111', (SELECT citizen_id FROM civicpulse_demo_users), 'Overflowing bins on Greenway', 'Public bins have not been collected for several days and waste is spilling onto the footpath.', 'Waste & Sanitation', 'Reported', 'North Ward', 23.8103, 90.4125, NULL),
  ('22222222-2222-4222-8222-222222222222', (SELECT citizen_id FROM civicpulse_demo_users), 'Broken streetlight at Lake Road', 'The streetlight beside the pedestrian crossing has been out for a week.', 'Electricity & Lighting', 'Reported', 'Central Ward', 23.8114, 90.4140, NULL),
  ('33333333-3333-4333-8333-333333333333', (SELECT citizen_id FROM civicpulse_demo_users), 'Blocked drain near the market', 'Rainwater is pooling around a blocked drain beside the market entrance.', 'Water & Drainage', 'Reported', 'Market Ward', 23.8088, 90.4109, NULL),
  ('44444444-4444-4444-8444-444444444444', (SELECT citizen_id FROM civicpulse_demo_users), 'Deep pothole on Main Road', 'A large pothole is forcing buses into the opposite lane near the school entrance.', 'Roads & Infrastructure', 'Reported', 'South Ward', 23.8068, 90.4161, '/demo/pothole-before.svg'),
  ('55555555-5555-4555-8555-555555555555', (SELECT citizen_id FROM civicpulse_demo_users), 'Damaged park bench repaired', 'A broken bench in Riverside Park was reported and repaired by the maintenance team.', 'Parks & Public Spaces', 'Reported', 'Riverside Ward', 23.8140, 90.4182, '/demo/bench-before.svg'),
  ('66666666-6666-4666-8666-666666666666', (SELECT citizen_id FROM civicpulse_demo_users), 'Another pothole report on Main Road', 'The same road hazard was reported from the nearby bus stop.', 'Roads & Infrastructure', 'Reported', 'South Ward', 23.8069, 90.4162, NULL);

SELECT public.change_report_status('22222222-2222-4222-8222-222222222222', 'Verified', 'Evidence reviewed by the administrator.');
SELECT public.change_report_status('33333333-3333-4333-8333-333333333333', 'Verified', 'Drain blockage confirmed by the community.');
SELECT public.change_report_status('33333333-3333-4333-8333-333333333333', 'Assigned', 'Routed to the water and drainage team.', (SELECT id FROM public.departments WHERE name = 'Water & Drainage'));
SELECT public.change_report_status('44444444-4444-4444-8444-444444444444', 'Verified', 'Road hazard confirmed.');
SELECT public.change_report_status('44444444-4444-4444-8444-444444444444', 'Assigned', 'Roads team assigned.', (SELECT id FROM public.departments WHERE name = 'Roads & Infrastructure'));
SELECT public.change_report_status('44444444-4444-4444-8444-444444444444', 'In Progress', 'Repair crew dispatched.');
SELECT public.change_report_status('55555555-5555-4555-8555-555555555555', 'Verified', 'Park maintenance request confirmed.');
SELECT public.change_report_status('55555555-5555-4555-8555-555555555555', 'Assigned', 'Routed to parks maintenance.', (SELECT id FROM public.departments WHERE name = 'Parks & Public Spaces'));
SELECT public.change_report_status('55555555-5555-4555-8555-555555555555', 'In Progress', 'Repair work started.');
SELECT public.change_report_status('55555555-5555-4555-8555-555555555555', 'Resolved', 'Bench replaced and area inspected.', NULL, NULL, 'The damaged bench was replaced and the surrounding path was cleared.', '/demo/bench-after.svg');
SELECT public.change_report_status('66666666-6666-4666-8666-666666666666', 'Duplicate', 'Linked to the canonical Main Road pothole report.', NULL, '44444444-4444-4444-8444-444444444444');

INSERT INTO public.report_reactions (report_id, user_id, type) VALUES
  ('44444444-4444-4444-8444-444444444444', (SELECT citizen_id FROM civicpulse_demo_users), 'affected'),
  ('44444444-4444-4444-8444-444444444444', (SELECT admin_id FROM civicpulse_demo_users), 'confirmed'),
  ('55555555-5555-4555-8555-555555555555', (SELECT citizen_id FROM civicpulse_demo_users), 'confirmed'),
  ('11111111-1111-4111-8111-111111111111', (SELECT admin_id FROM civicpulse_demo_users), 'affected');

INSERT INTO public.report_followers (report_id, user_id) VALUES
  ('44444444-4444-4444-8444-444444444444', (SELECT citizen_id FROM civicpulse_demo_users)),
  ('55555555-5555-4555-8555-555555555555', (SELECT citizen_id FROM civicpulse_demo_users)),
  ('33333333-3333-4333-8333-333333333333', (SELECT admin_id FROM civicpulse_demo_users));

INSERT INTO public.comments (report_id, user_id, body) VALUES
  ('44444444-4444-4444-8444-444444444444', (SELECT citizen_id FROM civicpulse_demo_users), 'This affects the school bus route every morning.'),
  ('44444444-4444-4444-8444-444444444444', (SELECT admin_id FROM civicpulse_demo_users), 'Official update: a repair crew has been dispatched.'),
  ('55555555-5555-4555-8555-555555555555', (SELECT citizen_id FROM civicpulse_demo_users), 'The repaired park bench is safe to use again.');

INSERT INTO public.notifications (id, user_id, report_id, type, title, message, read_at) VALUES
  ('aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1', (SELECT citizen_id FROM civicpulse_demo_users), '44444444-4444-4444-8444-444444444444', 'STATUS_CHANGED', 'Repair started', 'The Main Road pothole is now In Progress.', NULL),
  ('aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2', (SELECT citizen_id FROM civicpulse_demo_users), '55555555-5555-4555-8555-555555555555', 'REPORT_RESOLVED', 'Report resolved', 'The Riverside Park bench report has been resolved.', NULL),
  ('aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaa3', (SELECT citizen_id FROM civicpulse_demo_users), '44444444-4444-4444-8444-444444444444', 'NEW_COMMENT', 'New comment on report', 'A community update was posted on the Main Road pothole report.', NOW());

COMMIT;
