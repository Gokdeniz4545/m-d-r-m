-- Müdürüm — Test saati (zaman ileri/geri sarma)
-- Tek satır: offset_days kadar gün eklenerek uygulamanın "şimdi"si kaydırılır.
-- 0 = gerçek zaman. Sadece test/demo amaçlı; service-role ile güncellenir.

create table if not exists public.app_clock (
  id int primary key default 1,
  offset_days int not null default 0,
  updated_at timestamptz not null default now(),
  constraint app_clock_singleton check (id = 1)
);

insert into public.app_clock (id, offset_days) values (1, 0)
  on conflict (id) do nothing;

-- RLS açık, politika yok → yalnız service-role erişir (uygulama admin client ile okur).
alter table public.app_clock enable row level security;
