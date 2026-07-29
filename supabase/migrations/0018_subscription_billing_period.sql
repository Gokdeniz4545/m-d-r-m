-- Müdürüm — Abonelik türü (ödeme periyodu)
-- aylik / 3_aylik / 6_aylik / yillik. Nullable, mevcut kayıtlar etkilenmez.

alter table public.subscriptions add column if not exists billing_period text;
