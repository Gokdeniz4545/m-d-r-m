-- Müdürüm — Kurum bazlı faturalama modu
-- 'monthly' = aylık abonelik (varsayılan, mevcut davranış)
-- 'package' = ders paketi: aylık tahakkuk YOK; bakiye = devir(borç) − ödeme + düzeltme,
--             ders hakkı paket boyunca kümülatif (aylık sıfırlanmaz).
alter table public.organizations
  add column if not exists billing_mode text not null default 'monthly';
