-- Müdürüm — Ders/muhasebe iyileştirmeleri
-- 1) Telafi ders hakkı (makeup credits) aboneliğe
-- 2) Bakiye düzeltmeleri (adjustments) — manuel bakiye güncellemesi, notlu

-- 1) Telafi ders hakkı
alter table public.subscriptions
  add column if not exists makeup_credits int not null default 0;

-- 2) Bakiye düzeltme kayıtları (işaretli delta: + borç artışı, − azalış)
create table if not exists public.adjustments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_adjustments_student on public.adjustments(student_id);

-- RLS: payments ile birebir aynı tenant politikası (yalnız yönetici, kurum/şube kapsamı)
alter table public.adjustments enable row level security;
drop policy if exists tenant on public.adjustments;
create policy tenant on public.adjustments for all to authenticated
  using (public.is_super() or public.can_manage_person(student_id))
  with check (public.is_super() or public.can_manage_person(student_id));
