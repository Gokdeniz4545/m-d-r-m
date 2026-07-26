-- Müdürüm — İletişim + bildirim onayı (Ünite B0)
-- WhatsApp/e-posta hatırlatmaları için gerçek iletişim verisi ve KVKK/İYS onayı.

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists notify_consent boolean not null default false;
alter table public.profiles add column if not exists guardian_name text;
alter table public.profiles add column if not exists guardian_phone text;

-- Not: RLS politikaları (0004/0005) satır bazlı olduğu için yeni kolonlar
-- otomatik aynı erişim kurallarına tabidir; ek politika gerekmez.
