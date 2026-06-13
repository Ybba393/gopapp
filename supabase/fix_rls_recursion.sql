-- Fix infinite recursion in group_members policy
CREATE OR REPLACE FUNCTION public.get_my_group_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT group_id FROM public.group_members WHERE student_id = auth.uid() LIMIT 1;
$$;

DROP POLICY IF EXISTS "Students: read own group members" ON public.group_members;

CREATE POLICY "Students: read own group members" ON public.group_members
  FOR SELECT USING (
    group_id = public.get_my_group_id()
  );

-- Announcements table (admin → capstone groups)
-- group_id NULL = send to all groups
CREATE TABLE IF NOT EXISTS public.announcements (
  id         uuid primary key default uuid_generate_v4(),
  group_id   uuid references public.capstone_groups(id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students: read own group announcements" ON public.announcements
  FOR SELECT USING (
    group_id IS NULL OR
    group_id = public.get_my_group_id()
  );

CREATE POLICY "Admins: manage announcements" ON public.announcements
  FOR ALL USING (public.is_admin());
