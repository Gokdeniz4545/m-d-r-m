-- Abonelik yenileme: son yenileme zamanı + yenileme başına verilen ders paketi.
alter table public.subscriptions
  add column if not exists renewed_at timestamptz,
  add column if not exists package_quota integer;

-- Mevcut aboneliklerde paket = o anki toplam ders hakkı (ilk paket).
update public.subscriptions
  set package_quota = monthly_quota
  where package_quota is null;
