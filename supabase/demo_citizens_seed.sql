-- Additional Civic Pulse demo citizens and Bangladesh reports.
-- Run after creating the five Auth users listed below.
-- This fixture is safe to rerun for its fixed report IDs.
--
-- citizen.demo2@civicpulse.test
-- citizen.demo3@civicpulse.test
-- citizen.demo4@civicpulse.test
-- citizen.demo5@civicpulse.test
-- citizen.demo6@civicpulse.test

BEGIN;

CREATE TEMP TABLE civicpulse_extra_citizens ON COMMIT DROP AS
SELECT *
FROM (
  VALUES
    ('citizen.demo2@civicpulse.test'::text, 'Civic Pulse Dhaka Citizen'::text),
    ('citizen.demo3@civicpulse.test'::text, 'Civic Pulse Chattogram Citizen'::text),
    ('citizen.demo4@civicpulse.test'::text, 'Civic Pulse Sylhet Citizen'::text),
    ('citizen.demo5@civicpulse.test'::text, 'Civic Pulse Rajshahi Citizen'::text),
    ('citizen.demo6@civicpulse.test'::text, 'Civic Pulse Khulna Citizen'::text)
) AS expected(email, full_name);

ALTER TABLE civicpulse_extra_citizens ADD COLUMN user_id UUID;
UPDATE civicpulse_extra_citizens c
SET user_id = u.id
FROM auth.users u
WHERE lower(u.email) = c.email;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM civicpulse_extra_citizens WHERE user_id IS NULL) THEN
    RAISE EXCEPTION 'Create all five extra citizen Auth users listed at the top of supabase/demo_citizens_seed.sql before running this fixture.';
  END IF;
END $$;

UPDATE public.profiles p
SET full_name = c.full_name,
    role = 'civic'
FROM civicpulse_extra_citizens c
WHERE p.id = c.user_id;

-- Remove only this fixture's fixed records so reruns remain deterministic.
DELETE FROM public.comments WHERE report_id IN (
  '77777777-7777-4777-8777-777777777777',
  '88888888-8888-4888-8888-888888888888',
  '99999999-9999-4999-8999-999999999999',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
);
DELETE FROM public.report_reactions WHERE report_id IN (
  '77777777-7777-4777-8777-777777777777',
  '88888888-8888-4888-8888-888888888888',
  '99999999-9999-4999-8999-999999999999',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
);
DELETE FROM public.report_followers WHERE report_id IN (
  '77777777-7777-4777-8777-777777777777',
  '88888888-8888-4888-8888-888888888888',
  '99999999-9999-4999-8999-999999999999',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
);
DELETE FROM public.reports WHERE id IN (
  '77777777-7777-4777-8777-777777777777',
  '88888888-8888-4888-8888-888888888888',
  '99999999-9999-4999-8999-999999999999',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
);

INSERT INTO public.reports (id, user_id, title, description, category, status, zone, lat, lng)
SELECT *
FROM (
  VALUES
    ('77777777-7777-4777-8777-777777777777'::uuid, (SELECT user_id FROM civicpulse_extra_citizens WHERE email = 'citizen.demo2@civicpulse.test'), 'Blocked drain near Mohammadpur Town Hall', 'Rainwater is collecting beside the Mohammadpur Town Hall market because the roadside drain is blocked with plastic and silt.', 'Water & Drainage', 'Reported', 'Mohammadpur, Dhaka', 23.7677::double precision, 90.3587::double precision),
    ('88888888-8888-4888-8888-888888888888'::uuid, (SELECT user_id FROM civicpulse_extra_citizens WHERE email = 'citizen.demo3@civicpulse.test'), 'Broken footpath tiles in Agrabad', 'Loose tiles outside the Agrabad commercial area are causing pedestrians to step into traffic during busy office hours.', 'Roads & Infrastructure', 'Reported', 'Agrabad, Chattogram', 22.3234::double precision, 91.8116::double precision),
    ('99999999-9999-4999-8999-999999999999'::uuid, (SELECT user_id FROM civicpulse_extra_citizens WHERE email = 'citizen.demo4@civicpulse.test'), 'Overflowing bin near Shahjalal Uposhohor', 'The public bin beside the Shahjalal Uposhohor walkway has been overflowing since the weekend and attracting stray animals.', 'Waste & Sanitation', 'Reported', 'Shahjalal Uposhohor, Sylhet', 24.9070::double precision, 91.8760::double precision),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid, (SELECT user_id FROM civicpulse_extra_citizens WHERE email = 'citizen.demo5@civicpulse.test'), 'Pothole on Shaheb Bazar road', 'A deep pothole near Shaheb Bazar is difficult to see after sunset and is forcing rickshaws into oncoming traffic.', 'Roads & Infrastructure', 'Reported', 'Shaheb Bazar, Rajshahi', 24.3745::double precision, 88.6042::double precision),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid, (SELECT user_id FROM civicpulse_extra_citizens WHERE email = 'citizen.demo6@civicpulse.test'), 'Streetlight outage near Sonadanga bus stand', 'Two streetlights near the Sonadanga bus stand have been out for several nights, making the passenger queue hard to see.', 'Electricity & Lighting', 'Reported', 'Sonadanga, Khulna', 22.8158::double precision, 89.5510::double precision)
) AS seeded(id, user_id, title, description, category, status, zone, lat, lng);

INSERT INTO public.report_reactions (report_id, user_id, type)
SELECT r.id, c.user_id, 'affected'
FROM (
  VALUES
    ('77777777-7777-4777-8777-777777777777'::uuid, 'citizen.demo2@civicpulse.test'::text),
    ('88888888-8888-4888-8888-888888888888'::uuid, 'citizen.demo3@civicpulse.test'::text),
    ('99999999-9999-4999-8999-999999999999'::uuid, 'citizen.demo4@civicpulse.test'::text),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid, 'citizen.demo5@civicpulse.test'::text),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid, 'citizen.demo6@civicpulse.test'::text)
) AS r(id, email)
JOIN civicpulse_extra_citizens c ON c.email = r.email;

INSERT INTO public.comments (report_id, user_id, body)
SELECT r.id, c.user_id, 'I have added this report so the local team can review it.'
FROM (
  VALUES
    ('77777777-7777-4777-8777-777777777777'::uuid, 'citizen.demo2@civicpulse.test'::text),
    ('88888888-8888-4888-8888-888888888888'::uuid, 'citizen.demo3@civicpulse.test'::text),
    ('99999999-9999-4999-8999-999999999999'::uuid, 'citizen.demo4@civicpulse.test'::text),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid, 'citizen.demo5@civicpulse.test'::text),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid, 'citizen.demo6@civicpulse.test'::text)
) AS r(id, email)
JOIN civicpulse_extra_citizens c ON c.email = r.email;

COMMIT;
