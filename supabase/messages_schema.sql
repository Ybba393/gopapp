-- ============================================================
-- Messages — run this in Supabase SQL Editor
-- ============================================================

create table public.messages (
  id          uuid primary key default uuid_generate_v4(),
  student_id  uuid not null references public.profiles(id) on delete cascade,
  content     text not null,
  reply       text,
  replied_at  timestamptz,
  created_at  timestamptz not null default now()
);

alter table public.messages enable row level security;

-- Students can send and read their own messages
create policy "Students: manage own messages" on public.messages
  for all using (student_id = auth.uid());

-- Admins can read and update (reply to) all messages
create policy "Admins: manage all messages" on public.messages
  for all using (public.is_admin());
