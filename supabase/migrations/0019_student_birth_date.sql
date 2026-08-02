-- Müdürüm — Öğrenci doğum tarihi alanı
-- KSK geçiş listesindeki DOĞUM TARİHİ verisi için. Nullable, mevcut kayıtlar etkilenmez.

alter table public.profiles add column if not exists birth_date date;
