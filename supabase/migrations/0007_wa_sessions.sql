-- Müdürüm — WhatsApp oturum koordinasyonu (Ünite B1)
-- Web ile worker arasında durum/QR alışverişi. Baileys auth state worker diskinde.

create table if not exists public.wa_sessions (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  status text not null default 'disconnected'
    check (status in ('disconnected','connect_requested','qr_pending','connected')),
  qr text,                    -- taranacak QR string'i (worker yazar, web okur)
  phone_number text,          -- bağlanınca kurumun WhatsApp numarası
  last_error text,
  updated_at timestamptz not null default now()
);

-- RLS: kurum yöneticisi kendi kurumunun oturumunu görür/başlatır. Worker service-role ile bypass eder.
alter table public.wa_sessions enable row level security;
drop policy if exists tenant on public.wa_sessions;
create policy tenant on public.wa_sessions for all to authenticated
  using (public.is_super() or (public.is_admin() and organization_id = public.my_org()))
  with check (public.is_super() or (public.is_admin() and organization_id = public.my_org()));
