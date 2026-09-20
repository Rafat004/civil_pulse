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
  ('11111111-1111-4111-8111-111111111111', (SELECT citizen_id FROM civicpulse_demo_users), 'Overflowing bins near Karwan Bazar', 'Waste has not been collected beside the Karwan Bazar pedestrian route for several days, blocking part of the footpath during the evening rush.', 'Waste & Sanitation', 'Reported', 'Tejgaon, Dhaka', 23.7529, 90.3915, NULL),
  ('22222222-2222-4222-8222-222222222222', (SELECT citizen_id FROM civicpulse_demo_users), 'Broken streetlight on Mirpur Road', 'The streetlight outside the Dhanmondi bus stop has been out for a week, leaving the crossing difficult to see after sunset.', 'Electricity & Lighting', 'Reported', 'Dhanmondi, Dhaka', 23.7561, 90.3629, NULL),
  ('33333333-3333-4333-8333-333333333333', (SELECT citizen_id FROM civicpulse_demo_users), 'Waterlogging at Muradpur intersection', 'Rainwater is pooling across the Muradpur intersection and slowing buses and rickshaws after moderate rainfall.', 'Water & Drainage', 'Reported', 'Muradpur, Chattogram', 22.3651, 91.8246, NULL),
  ('44444444-4444-4444-8444-444444444444', (SELECT citizen_id FROM civicpulse_demo_users), 'Deep pothole beside Farmgate overpass', 'A deep pothole beside the Farmgate overpass is forcing buses and CNGs into the next lane during the morning commute.', 'Roads & Infrastructure', 'Reported', 'Farmgate, Dhaka', 23.7572, 90.3892, '/demo/pothole-before.svg'),
  ('55555555-5555-4555-8555-555555555555', (SELECT citizen_id FROM civicpulse_demo_users), 'Damaged bench at Zindabazar walkway', 'A damaged public bench beside the Zindabazar walking route was repaired and the surrounding pavement was cleared by the maintenance team.', 'Parks & Public Spaces', 'Reported', 'Zindabazar, Sylhet', 24.8949, 91.8687, '/demo/bench-before.svg'),
  ('66666666-6666-4666-8666-666666666666', (SELECT citizen_id FROM civicpulse_demo_users), 'Duplicate pothole report near Farmgate', 'The same Farmgate road hazard was reported again from the nearby bus stop.', 'Roads & Infrastructure', 'Reported', 'Farmgate, Dhaka', 23.7573, 90.3893, NULL);

SELECT public.change_report_status('22222222-2222-4222-8222-222222222222', 'Verified', 'Streetlight outage verified by the administrator.');
SELECT public.change_report_status('33333333-3333-4333-8333-333333333333', 'Verified', 'Waterlogging confirmed by the community after rainfall.');
SELECT public.change_report_status('33333333-3333-4333-8333-333333333333', 'Assigned', 'Routed to the Chattogram water and drainage team.', (SELECT id FROM public.departments WHERE name = 'Water & Drainage'));
SELECT public.change_report_status('44444444-4444-4444-8444-444444444444', 'Verified', 'Farmgate road hazard confirmed.');
SELECT public.change_report_status('44444444-4444-4444-8444-444444444444', 'Assigned', 'Dhaka roads team assigned.', (SELECT id FROM public.departments WHERE name = 'Roads & Infrastructure'));
SELECT public.change_report_status('44444444-4444-4444-8444-444444444444', 'In Progress', 'Repair crew dispatched toward Farmgate.');
SELECT public.change_report_status('55555555-5555-4555-8555-555555555555', 'Verified', 'Public-space maintenance request confirmed in Sylhet.');
SELECT public.change_report_status('55555555-5555-4555-8555-555555555555', 'Assigned', 'Routed to the Sylhet parks maintenance team.', (SELECT id FROM public.departments WHERE name = 'Parks & Public Spaces'));
SELECT public.change_report_status('55555555-5555-4555-8555-555555555555', 'In Progress', 'Repair work started at the Zindabazar walkway.');
SELECT public.change_report_status('55555555-5555-4555-8555-555555555555', 'Resolved', 'Bench replaced and walkway inspected.', NULL, NULL, 'The damaged bench was replaced and the surrounding pavement was cleared.', '/demo/bench-after.svg');
SELECT public.change_report_status('66666666-6666-4666-8666-666666666666', 'Duplicate', 'Linked to the canonical Farmgate pothole report.', NULL, '44444444-4444-4444-8444-444444444444');

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
  ('44444444-4444-4444-8444-444444444444', (SELECT citizen_id FROM civicpulse_demo_users), 'This affects the Farmgate bus route every morning.'),
  ('44444444-4444-4444-8444-444444444444', (SELECT admin_id FROM civicpulse_demo_users), 'Official update: a Dhaka roads repair crew has been dispatched.'),
  ('55555555-5555-4555-8555-555555555555', (SELECT citizen_id FROM civicpulse_demo_users), 'The repaired Zindabazar bench is safe to use again.');

INSERT INTO public.notifications (id, user_id, report_id, type, title, message, read_at) VALUES
  ('aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1', (SELECT citizen_id FROM civicpulse_demo_users), '44444444-4444-4444-8444-444444444444', 'STATUS_CHANGED', 'Farmgate repair started', 'The Farmgate pothole report is now In Progress.', NULL),
  ('aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2', (SELECT citizen_id FROM civicpulse_demo_users), '55555555-5555-4555-8555-555555555555', 'REPORT_RESOLVED', 'Report resolved', 'The Zindabazar bench report has been resolved.', NULL),
  ('aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaa3', (SELECT citizen_id FROM civicpulse_demo_users), '44444444-4444-4444-8444-444444444444', 'NEW_COMMENT', 'New comment on report', 'A community update was posted on the Farmgate pothole report.', NOW());

COMMIT;
