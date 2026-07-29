-- Müdürüm — Öğrenci kimlik/iletişim alanları
-- TC kimlik numarası ve adres (öğrenci profili). Nullable, mevcut kayıtlar etkilenmez.

alter table public.profiles add column if not exists tc_kimlik_no text;
alter table public.profiles add column if not exists address text;
