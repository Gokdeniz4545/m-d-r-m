-- Müdürüm — Öğretmen branşları, çoklu öğretmen, fatura vade tarihi

-- Öğretmenin verebileceği branşlar (teacher ↔ subjects)
create table if not exists public.teacher_subjects (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  unique (teacher_id, subject_id)
);

-- Derse birden fazla öğretmen (class ↔ teachers)
create table if not exists public.class_teachers (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  unique (class_id, teacher_id)
);

-- Mevcut tek öğretmenleri class_teachers'a taşı (geriye dönük)
insert into public.class_teachers (class_id, teacher_id)
select id, teacher_id from public.classes
where teacher_id is not null
on conflict (class_id, teacher_id) do nothing;

-- Faturalar için vade/son ödeme tarihi
alter table public.expenses add column if not exists due_date date;

-- ── RLS ──
alter table public.teacher_subjects enable row level security;
drop policy if exists tenant on public.teacher_subjects;
create policy tenant on public.teacher_subjects for all to authenticated
  using (public.is_super() or public.can_read_person(teacher_id))
  with check (public.is_super() or public.can_manage_person(teacher_id));

alter table public.class_teachers enable row level security;
drop policy if exists tenant on public.class_teachers;
create policy tenant on public.class_teachers for all to authenticated
  using (public.is_super() or public.can_read_class(class_id))
  with check (public.is_super() or public.can_manage_class(class_id));
