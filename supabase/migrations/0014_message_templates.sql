-- Müdürüm — Kurum özelleştirmeli mesaj şablonları (mesaj türleri)
-- Örn: "Ödeme hatırlatma", "Derse gelmedi", "Telafi" — kurum yöneticisi
-- metni özelleştirir ve yeni tür ekleyebilir.

create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  body text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_message_templates_org on public.message_templates(organization_id);

alter table public.message_templates enable row level security;
drop policy if exists tenant on public.message_templates;
create policy tenant on public.message_templates for all to authenticated
  using (public.is_super() or (public.is_admin() and organization_id = public.my_org()))
  with check (public.is_super() or (public.is_admin() and organization_id = public.my_org()));
