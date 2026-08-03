-- Tüm dersler 45 dakika. Mevcut oturum ve haftalık slotların bitiş saatini
-- başlangıç + 45 dk olarak sabitler (60 dk kayıtlılar 45'e iner). Böylece bir
-- dersin bittiği tam slot bir sonraki eyleme açık olur.
update public.sessions
  set end_time = (start_time::time + interval '45 minutes')::time
  where end_time <> (start_time::time + interval '45 minutes')::time;

update public.schedule_slots
  set end_time = (start_time::time + interval '45 minutes')::time
  where end_time <> (start_time::time + interval '45 minutes')::time;
