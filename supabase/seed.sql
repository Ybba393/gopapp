-- ============================================================
-- Generation of Promise (GOP) — Seed Data
-- Run AFTER schema.sql
-- ============================================================

-- ============================================================
-- 1. Create the active cohort
-- ============================================================

insert into public.cohorts (name, year, is_active)
values ('2026–2027 Cohort', '2026-2027', true);

-- ============================================================
-- 2. Seed the admin onto the roster
--    (Sign up at the app with this email + default password GOPStudent
--     → your profile will be created with role = 'admin' automatically)
-- ============================================================

insert into public.roster (email, name, cohort_id, is_admin)
values (
  'abby.nguyen77@gmail.com',
  'Program Admin',
  null,     -- admin is not part of a student cohort
  true
);

-- ============================================================
-- 3. Seed the 7 program days for the 2026–2027 cohort
--    Dates mirror the 2025–2026 cohort schedule, shifted one year.
--    Only Race & Culture Day has an exit ticket (has_exit_ticket = true).
-- ============================================================

insert into public.program_days (cohort_id, title, description, date, has_exit_ticket, sort_order)
select
  c.id,
  d.title,
  d.description,
  d.date::date,
  d.has_exit_ticket,
  d.sort_order
from public.cohorts c
cross join (
  values
    ('Break the Ice',
     'Build trust and connection through interactive activities and meaningful conversation.',
     '2026-10-08', false, 1),
    ('Race & Culture Day',
     'Reflect on cultural identity and practice honest, respectful dialogue across differences.',
     '2026-11-12', true, 2),
    ('Detroit Focus Day',
     'Experience Detroit''s history and neighborhoods firsthand with local changemakers.',
     '2026-12-10', false, 3),
    ('Critical Issues Day',
     'Explore social issues affecting communities and collaborate on creative ideas for change.',
     '2027-01-07', false, 4),
    ('Volunteering / Advocacy Day',
     'Engage in hands-on service and learn how advocacy connects to community impact.',
     '2027-02-11', false, 5),
    ('Capstone Prep / Project Day',
     'Work in teams to finalize project ideas and create action plans for implementation.',
     '2027-03-11', false, 6),
    ('Graduation & Celebration',
     'Celebrate accomplishments and present capstone projects to family and peers.',
     '2027-05-06', false, 7)
) as d(title, description, date, has_exit_ticket, sort_order)
where c.year = '2026-2027';

-- ============================================================
-- NOTES
-- ============================================================
-- After running this seed:
--
-- 1. Go to your app's login screen → Sign Up
--    Use email: abby.nguyen77@gmail.com
--    Password: GOPStudent (the default — you'll be prompted to change it)
--
-- 2. To add students to the roster, use the Admin Dashboard → Roster page.
--    Students can only sign up if their email is in the roster.
--
-- 3. To add a new cohort/year, use the Admin Dashboard → Cohorts page,
--    then create the 7 program days for that cohort.
-- ============================================================
