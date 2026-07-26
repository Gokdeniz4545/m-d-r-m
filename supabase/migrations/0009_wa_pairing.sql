-- Müdürüm — WhatsApp numarayla (pairing code) bağlama (Ünite B1)
-- QR taramak yerine telefona kod girerek bağlanma seçeneği.

alter table public.wa_sessions add column if not exists pair_phone text;
