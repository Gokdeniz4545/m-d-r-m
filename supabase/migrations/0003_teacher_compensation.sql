-- Müdürüm — Öğretmen hakediş ayarı (Ünite 3)
-- Her öğretmen için ücret tipi: 'per_session' (ders başı) veya 'monthly' (aylık).
-- Öğrenci aboneliğinin öğretmen karşılığı.

create table if not exists public.teacher_compensation (
  teacher_id uuid primary key references public.profiles(id) on delete cascade,
  comp_type text not null check (comp_type in ('per_session', 'monthly')),
  rate numeric(12,2) not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.teacher_compensation enable row level security;
drop policy if exists auth_all on public.teacher_compensation;
create policy auth_all on public.teacher_compensation
  for all to authenticated using (true) with check (true);
