-- Müdürüm — Resmi WhatsApp Cloud API (Embedded Signup) kurum kimlik bilgileri
-- Baileys/QR (wa_sessions) yerine: her kurumun Meta WABA kimliği.

create table if not exists public.wa_cloud (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  waba_id text,
  phone_number_id text,
  display_phone text,
  access_token text,      -- kurumun WABA token'ı (kendi kimliği)
  status text not null default 'disconnected'
    check (status in ('disconnected','connected')),
  last_error text,
  connected_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.wa_cloud enable row level security;
drop policy if exists tenant on public.wa_cloud;
create policy tenant on public.wa_cloud for all to authenticated
  using (public.is_super() or (public.is_admin() and organization_id = public.my_org()))
  with check (public.is_super() or (public.is_admin() and organization_id = public.my_org()));
