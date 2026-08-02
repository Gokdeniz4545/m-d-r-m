-- Müdürüm — sessions/schedule_slots/attendance RLS'i öğrenci+öğretmen bazlı
-- Eski politikalar class_id'ye dayanıyordu; "ders/sınıf" kalktığı için yeni
-- (class_id'siz) satırlar görünmüyordu. Artık student_id/teacher_id üzerinden.
-- can_read_person / can_manage_person / my_role / is_super yardımcıları mevcut (0004/0005).

drop policy if exists tenant on public.schedule_slots;
create policy tenant on public.schedule_slots for all to authenticated
  using (
    public.is_super()
    or public.can_read_person(student_id)
    or teacher_id = auth.uid()
  )
  with check (
    public.is_super()
    or public.can_manage_person(student_id)
    or teacher_id = auth.uid()
  );

drop policy if exists tenant on public.sessions;
create policy tenant on public.sessions for all to authenticated
  using (
    public.is_super()
    or public.can_read_person(student_id)
    or teacher_id = auth.uid()
  )
  with check (
    public.is_super()
    or public.can_manage_person(student_id)
    or teacher_id = auth.uid()
  );

-- attendance: öğretmen kendi oturumunun yoklamasını girebilsin (sessions.teacher_id)
drop policy if exists tenant on public.attendance;
create policy tenant on public.attendance for all to authenticated
  using (public.is_super() or public.can_read_person(student_id))
  with check (
    public.is_super()
    or public.can_manage_person(student_id)
    or (public.my_role() = 'teacher' and exists (
        select 1 from public.sessions s
        where s.id = session_id and s.teacher_id = auth.uid()))
  );
