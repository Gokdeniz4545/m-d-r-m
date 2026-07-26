-- Müdürüm — "Personel/Diğer" rolü (temizlikçi vb. — maaş ödenen diğer çalışanlar)

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in
    ('super_admin','org_admin','branch_admin','teacher','student','parent','staff'));
