-- Müdürüm — Ödemeyi alan kişi
-- Tahsilat kaydına ödemeyi teslim alan kişinin adı (makbuzda gösterilir).
-- Nullable, mevcut kayıtlar etkilenmez.

alter table public.payments add column if not exists received_by text;
