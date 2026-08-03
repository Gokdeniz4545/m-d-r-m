-- Müdürüm — sessions/schedule_slots.class_id artık zorunlu değil
-- "Ders/sınıf" kalktığı için oturum ve slotlar öğrenci+öğretmen ile kuruluyor;
-- class_id boş (null) olabilmeli.
alter table public.sessions alter column class_id drop not null;
alter table public.schedule_slots alter column class_id drop not null;
