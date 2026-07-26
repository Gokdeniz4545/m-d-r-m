-- Müdürüm — Bildirim kuyruğu + log (Ünite B2.1)
-- Kanal-bağımsız. Web/cron enqueue eder; worker gönderir.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel text not null default 'whatsapp',
  to_number text,
  recipient_profile_id uuid references public.profiles(id) on delete set null,
  template text,
  body text not null,
  status text not null default 'queued'
    check (status in ('queued','sending','sent','failed','canceled')),
  error text,
  scheduled_for timestamptz,
  sent_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_org on public.notifications(organization_id);
create index if not exists idx_notifications_status on public.notifications(status);

-- RLS: yönetici kendi kurumunun bildirimlerini görür/oluşturur. Worker service-role bypass.
alter table public.notifications enable row level security;
drop policy if exists tenant on public.notifications;
create policy tenant on public.notifications for all to authenticated
  using (public.is_super() or (public.is_admin() and organization_id = public.my_org()))
  with check (public.is_super() or (public.is_admin() and organization_id = public.my_org()));
