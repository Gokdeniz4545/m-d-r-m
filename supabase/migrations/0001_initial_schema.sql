-- Müdürüm — Çekirdek şema (Ünite 0/1)
-- Mevcut uygulama kodunun ihtiyaç duyduğu 13 tablo + 6 rol.
-- NOT: RLS bu ilk sürümde "giriş yapmış herkes" için geçici olarak izinlidir
-- (tek kişilik dev testi için). Rebuild Ünite 1'de kurum/şube bazlı gerçek
-- RLS politikaları yazılacak. Yazma işlemleri zaten service-role ile yapılıyor.

-- ── Kimlik & kurum ──────────────────────────────────────────────
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  address text,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  username text not null unique,
  full_name text,
  phone text,
  role text not null check (role in
    ('super_admin','org_admin','branch_admin','teacher','student','parent')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.branch_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  role text not null,
  unique (user_id, branch_id)
);

-- ── Akademik çekirdek ───────────────────────────────────────────
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  unique (organization_id, name)
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  teacher_id uuid references public.profiles(id) on delete set null,
  name text,
  type text not null default 'group' check (type in ('one_on_one','group')),
  capacity int,
  created_at timestamptz not null default now()
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (class_id, student_id)
);

create table if not exists public.schedule_slots (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  weekday int not null check (weekday between 1 and 7),
  start_time time not null,
  end_time time not null
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  slot_id uuid references public.schedule_slots(id) on delete set null,
  is_makeup boolean not null default false,
  unique (class_id, date, start_time)
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('present','absent','excused','late')),
  recorded_by uuid references public.profiles(id) on delete set null,
  recorded_at timestamptz not null default now(),
  unique (session_id, student_id)
);

-- ── Muhasebe (temel) ────────────────────────────────────────────
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade unique,
  monthly_fee numeric(12,2) not null default 0,
  monthly_quota int,
  total_months int check (total_months between 1 and 12),
  start_date date not null default current_date,
  status text not null default 'active'
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null,
  period_month date,
  paid_at timestamptz not null default now(),
  note text
);

-- ── Gündem ──────────────────────────────────────────────────────
create table if not exists public.agenda_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  author_name text,
  author_role text,
  body text not null,
  created_at timestamptz not null default now()
);

-- ── Yararlı indeksler ───────────────────────────────────────────
create index if not exists idx_profiles_org on public.profiles(organization_id);
create index if not exists idx_branches_org on public.branches(organization_id);
create index if not exists idx_classes_branch on public.classes(branch_id);
create index if not exists idx_sessions_class_date on public.sessions(class_id, date);
create index if not exists idx_attendance_session on public.attendance(session_id);
create index if not exists idx_payments_student on public.payments(student_id);

-- ── RLS (geçici izinli politika — Ünite 1'de sıkılaştırılacak) ───
do $$
declare t text;
begin
  foreach t in array array[
    'organizations','branches','profiles','branch_memberships','subjects',
    'classes','enrollments','schedule_slots','sessions','attendance',
    'subscriptions','payments','agenda_notes'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists auth_all on public.%I;', t);
    execute format(
      'create policy auth_all on public.%I for all to authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;
