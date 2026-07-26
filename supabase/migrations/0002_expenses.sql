-- Müdürüm — Giderler (Ünite 3)
-- Kurum/şube giderleri + öğretmen hakedişi (kategori 'maas', teacher_id ile).

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  category text not null,
  teacher_id uuid references public.profiles(id) on delete set null,
  amount numeric(12,2) not null,
  expense_date date not null default current_date,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_expenses_org on public.expenses(organization_id);
create index if not exists idx_expenses_date on public.expenses(expense_date);

-- RLS (geçici izinli — Ünite 1'de sıkılaştırılacak)
alter table public.expenses enable row level security;
drop policy if exists auth_all on public.expenses;
create policy auth_all on public.expenses for all to authenticated using (true) with check (true);
