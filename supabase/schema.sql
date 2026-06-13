-- ============================================================
-- Generation of Promise (GOP) — Supabase Schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Cohorts (e.g. "2026–2027 Cohort")
create table public.cohorts (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,           -- "2026–2027 Cohort"
  year        text not null,           -- "2026-2027"
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Pre-approved roster (admin adds students here before they can sign up)
create table public.roster (
  id          uuid primary key default uuid_generate_v4(),
  email       text unique not null,
  name        text not null,
  cohort_id   uuid references public.cohorts(id) on delete set null,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Student/admin profiles (auto-created on auth signup via trigger)
create table public.profiles (
  id                        uuid primary key references auth.users(id) on delete cascade,
  name                      text not null,
  email                     text not null,
  role                      text not null default 'student' check (role in ('student', 'admin')),
  cohort_id                 uuid references public.cohorts(id) on delete set null,
  default_password_changed  boolean not null default false,
  created_at                timestamptz not null default now()
);

-- Capstone groups
create table public.capstone_groups (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  cohort_id   uuid references public.cohorts(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- Group membership (one group per student enforced by unique constraint)
create table public.group_members (
  id          uuid primary key default uuid_generate_v4(),
  student_id  uuid not null references public.profiles(id) on delete cascade,
  group_id    uuid not null references public.capstone_groups(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (student_id)
);

-- Volunteer hours log
create table public.volunteer_logs (
  id            uuid primary key default uuid_generate_v4(),
  student_id    uuid not null references public.profiles(id) on delete cascade,
  project_name  text not null,
  hours         numeric(5, 1) not null check (hours > 0),
  description   text,
  date          date not null,
  created_at    timestamptz not null default now()
);

-- Program days (seeded per cohort)
create table public.program_days (
  id               uuid primary key default uuid_generate_v4(),
  cohort_id        uuid references public.cohorts(id) on delete cascade,
  title            text not null,
  description      text,
  date             date not null,
  has_exit_ticket  boolean not null default false,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now()
);

-- Attendance (self-check-in, only allowed after 9am on program day)
create table public.attendance (
  id               uuid primary key default uuid_generate_v4(),
  student_id       uuid not null references public.profiles(id) on delete cascade,
  program_day_id   uuid not null references public.program_days(id) on delete cascade,
  status           text not null default 'present' check (status in ('present', 'absent')),
  checked_in_at    timestamptz not null default now(),
  unique (student_id, program_day_id)
);

-- Exit ticket responses (one per student per program day, locked after submit)
create table public.exit_ticket_responses (
  id               uuid primary key default uuid_generate_v4(),
  student_id       uuid not null references public.profiles(id) on delete cascade,
  program_day_id   uuid not null references public.program_days(id) on delete cascade,
  responses        jsonb not null,
  submitted_at     timestamptz not null default now(),
  unique (student_id, program_day_id)
);

-- ============================================================
-- HELPER FUNCTIONS (security definer avoids RLS recursion)
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Check if an email is on the pre-approved roster
create or replace function public.is_email_on_roster(user_email text)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.roster
    where lower(email) = lower(user_email)
  );
$$;

-- ============================================================
-- TRIGGER: auto-create profile when auth user signs up
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  v_roster_row public.roster%rowtype;
begin
  -- Look up roster entry for this email
  select * into v_roster_row
  from public.roster
  where lower(email) = lower(new.email)
  limit 1;

  -- Only create profile if email is on roster
  if found then
    insert into public.profiles (id, name, email, role, cohort_id, default_password_changed)
    values (
      new.id,
      v_roster_row.name,
      new.email,
      case when v_roster_row.is_admin then 'admin' else 'student' end,
      v_roster_row.cohort_id,
      false
    );
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.roster enable row level security;
alter table public.cohorts enable row level security;
alter table public.capstone_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.volunteer_logs enable row level security;
alter table public.program_days enable row level security;
alter table public.attendance enable row level security;
alter table public.exit_ticket_responses enable row level security;

-- profiles
create policy "Students: view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Admins: view all profiles" on public.profiles
  for select using (public.is_admin());

create policy "Users: update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Admins: update all profiles" on public.profiles
  for update using (public.is_admin());

-- roster (only admin can manage; app uses the RPC function to check)
create policy "Admins: full access to roster" on public.roster
  for all using (public.is_admin());

-- cohorts (everyone authenticated can read)
create policy "Authenticated: read cohorts" on public.cohorts
  for select using (auth.role() = 'authenticated');

create policy "Admins: manage cohorts" on public.cohorts
  for all using (public.is_admin());

-- capstone_groups (students can read their cohort's groups)
create policy "Students: read groups in own cohort" on public.capstone_groups
  for select using (
    cohort_id = (select cohort_id from public.profiles where id = auth.uid())
  );

create policy "Admins: manage capstone groups" on public.capstone_groups
  for all using (public.is_admin());

-- group_members (students can read their group's members)
create policy "Students: read own group members" on public.group_members
  for select using (
    group_id in (
      select group_id from public.group_members where student_id = auth.uid()
    )
  );

create policy "Admins: manage group members" on public.group_members
  for all using (public.is_admin());

-- volunteer_logs (students manage own logs; admin reads all)
create policy "Students: manage own volunteer logs" on public.volunteer_logs
  for all using (student_id = auth.uid());

create policy "Admins: read all volunteer logs" on public.volunteer_logs
  for select using (public.is_admin());

-- program_days (everyone authenticated can read their cohort's days)
create policy "Students: read program days for own cohort" on public.program_days
  for select using (
    cohort_id = (select cohort_id from public.profiles where id = auth.uid())
    or public.is_admin()
  );

create policy "Admins: manage program days" on public.program_days
  for all using (public.is_admin());

-- attendance
create policy "Students: manage own attendance" on public.attendance
  for all using (student_id = auth.uid());

create policy "Admins: read all attendance" on public.attendance
  for select using (public.is_admin());

-- exit_ticket_responses
create policy "Students: manage own responses" on public.exit_ticket_responses
  for all using (student_id = auth.uid());

create policy "Admins: read all responses" on public.exit_ticket_responses
  for select using (public.is_admin());
