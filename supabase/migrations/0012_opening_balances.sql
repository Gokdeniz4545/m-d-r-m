-- Müdürüm — Entegrasyon/geçiş: açılış devir alanları
-- Mevcut öğrencili okullar "kaldığı yerden" devam edebilsin diye.

-- Bu döngüde (geçiş ayında) zaten kullanılmış ders sayısı
alter table public.subscriptions add column if not exists opening_used int not null default 0;
-- opening_used'in uygulanacağı ay (YYYY-MM). O ay geçince otomatik devre dışı.
alter table public.subscriptions add column if not exists opening_period text;
-- Geçiş anındaki finansal bakiye: > 0 borç, < 0 alacak (peşin ödeme)
alter table public.subscriptions add column if not exists opening_balance numeric(12,2) not null default 0;
