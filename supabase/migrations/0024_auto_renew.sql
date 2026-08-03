-- Müdürüm — Otomatik yenileme şalteri
-- auto_renew = true (varsayılan): ders hakkı bitince öğrenci aktif kalır.
-- auto_renew = false: ders hakkı bitince öğrenci pasife düşer.
alter table public.subscriptions
  add column if not exists auto_renew boolean not null default true;
