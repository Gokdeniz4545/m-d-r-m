-- Müdürüm — Öğretmen-öğrenci modeli (Faz 1, eklemeli)
-- "Ders/sınıf" kavramından öğrenci→öğretmen modeline geçişin temeli.
-- Bu migration EKLEMELIDIR: hiçbir şey silinmez, mevcut UI çalışmaya devam eder.

-- Öğrenci → öğretmen (tekil)
alter table public.profiles
  add column if not exists teacher_id uuid references public.profiles(id) on delete set null;
create index if not exists idx_profiles_teacher on public.profiles(teacher_id);

-- Oturum ve haftalık slot: ders yerine öğrenci+öğretmen
alter table public.sessions
  add column if not exists student_id uuid references public.profiles(id) on delete cascade;
alter table public.sessions
  add column if not exists teacher_id uuid references public.profiles(id) on delete set null;
alter table public.schedule_slots
  add column if not exists student_id uuid references public.profiles(id) on delete cascade;
alter table public.schedule_slots
  add column if not exists teacher_id uuid references public.profiles(id) on delete set null;
create index if not exists idx_sessions_student on public.sessions(student_id);
create index if not exists idx_slots_student on public.schedule_slots(student_id);

-- Özel etkinlikler (öğrenciyle ilgisiz; öğretmen takvimini kapatır)
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_calendar_events_teacher_date
  on public.calendar_events(teacher_id, date);

alter table public.calendar_events enable row level security;
drop policy if exists tenant on public.calendar_events;
create policy tenant on public.calendar_events for all to authenticated
  using (public.is_super() or organization_id = public.my_org())
  with check (public.is_super() or organization_id = public.my_org());
