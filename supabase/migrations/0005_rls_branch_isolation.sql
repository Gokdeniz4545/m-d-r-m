-- Müdürüm — Şube bazlı ince izolasyon (Ünite 1 güvenlik, 2. aşama)
-- org_admin & super: tüm kurum. branch_admin: yalnız yönettiği şube(ler).
-- teacher/student: yalnız üyesi olduğu şube. Kurum sınırı korunur.

-- ── Rol-farkında yardımcılar ────────────────────────────────────
create or replace function public.is_my_admin_branch(bid uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.branch_memberships m
    where m.user_id = auth.uid() and m.branch_id = bid and m.role = 'branch_admin'
  )
$$;

-- pid ile aynı şubede miyiz (herhangi bir üyelik)
create or replace function public.shares_branch(pid uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.branch_memberships m1
    join public.branch_memberships m2 on m1.branch_id = m2.branch_id
    where m1.user_id = auth.uid() and m2.user_id = pid
  )
$$;

create or replace function public.can_read_branch(bid uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select case
    when public.is_super() then true
    when public.my_role() = 'org_admin' then
      exists (select 1 from public.branches b where b.id = bid and b.organization_id = public.my_org())
    when public.my_role() = 'branch_admin' then public.is_my_admin_branch(bid)
    else exists (select 1 from public.branch_memberships m where m.user_id = auth.uid() and m.branch_id = bid)
  end
$$;

create or replace function public.can_manage_branch(bid uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select case
    when public.is_super() then true
    when public.my_role() = 'org_admin' then
      exists (select 1 from public.branches b where b.id = bid and b.organization_id = public.my_org())
    when public.my_role() = 'branch_admin' then public.is_my_admin_branch(bid)
    else false
  end
$$;

create or replace function public.can_read_person(pid uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select case
    when public.is_super() then true
    when pid = auth.uid() then true
    when public.my_role() = 'org_admin' then public.person_in_my_org(pid)
    when public.my_role() = 'branch_admin' then exists (
      select 1 from public.branch_memberships m
      where m.user_id = pid and public.is_my_admin_branch(m.branch_id))
    else public.shares_branch(pid)
  end
$$;

create or replace function public.can_manage_person(pid uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select case
    when public.is_super() then true
    when public.my_role() = 'org_admin' then public.person_in_my_org(pid)
    when public.my_role() = 'branch_admin' then exists (
      select 1 from public.branch_memberships m
      where m.user_id = pid and public.is_my_admin_branch(m.branch_id))
    else false
  end
$$;

create or replace function public.can_read_class(cid uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select case
    when public.is_super() then true
    when public.my_role() = 'org_admin' then public.class_in_my_org(cid)
    when public.my_role() = 'branch_admin' then
      exists (select 1 from public.classes c where c.id = cid and public.is_my_admin_branch(c.branch_id))
    else exists (
      select 1 from public.classes c
      join public.branch_memberships m on m.branch_id = c.branch_id
      where c.id = cid and m.user_id = auth.uid())
  end
$$;

create or replace function public.can_manage_class(cid uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.classes c where c.id = cid and public.can_manage_branch(c.branch_id))
$$;

grant execute on function public.is_my_admin_branch(uuid) to authenticated, anon;
grant execute on function public.shares_branch(uuid) to authenticated, anon;
grant execute on function public.can_read_branch(uuid) to authenticated, anon;
grant execute on function public.can_manage_branch(uuid) to authenticated, anon;
grant execute on function public.can_read_person(uuid) to authenticated, anon;
grant execute on function public.can_manage_person(uuid) to authenticated, anon;
grant execute on function public.can_read_class(uuid) to authenticated, anon;
grant execute on function public.can_manage_class(uuid) to authenticated, anon;

-- ── Politikaları şube-farkında olacak şekilde değiştir ──────────
drop policy if exists tenant on public.branches;
create policy tenant on public.branches for all to authenticated
  using (public.can_read_branch(id))
  with check (public.is_super() or (public.my_role() = 'org_admin' and organization_id = public.my_org()));

drop policy if exists tenant on public.profiles;
create policy tenant on public.profiles for all to authenticated
  using (public.can_read_person(id))
  with check (public.is_super() or public.can_manage_person(id) or id = auth.uid());

drop policy if exists tenant on public.branch_memberships;
create policy tenant on public.branch_memberships for all to authenticated
  using (public.is_super() or user_id = auth.uid() or public.can_read_branch(branch_id))
  with check (public.can_manage_branch(branch_id));

drop policy if exists tenant on public.classes;
create policy tenant on public.classes for all to authenticated
  using (public.can_read_class(id))
  with check (public.can_manage_branch(branch_id));

drop policy if exists tenant on public.enrollments;
create policy tenant on public.enrollments for all to authenticated
  using (public.is_super() or public.can_read_person(student_id))
  with check (public.can_manage_person(student_id));

drop policy if exists tenant on public.schedule_slots;
create policy tenant on public.schedule_slots for all to authenticated
  using (public.can_read_class(class_id))
  with check (public.can_manage_class(class_id));

drop policy if exists tenant on public.sessions;
create policy tenant on public.sessions for all to authenticated
  using (public.can_read_class(class_id))
  with check (public.can_manage_class(class_id));

drop policy if exists tenant on public.attendance;
create policy tenant on public.attendance for all to authenticated
  using (public.is_super() or public.can_read_person(student_id))
  with check (
    public.is_super()
    or public.can_manage_person(student_id)
    or (public.my_role() = 'teacher' and exists (
        select 1 from public.sessions s
        join public.classes c on c.id = s.class_id
        where s.id = session_id and c.teacher_id = auth.uid()))
  );

drop policy if exists tenant on public.subscriptions;
create policy tenant on public.subscriptions for all to authenticated
  using (public.is_super() or student_id = auth.uid() or public.can_manage_person(student_id))
  with check (public.is_super() or public.can_manage_person(student_id));

drop policy if exists tenant on public.payments;
create policy tenant on public.payments for all to authenticated
  using (public.is_super() or public.can_manage_person(student_id))
  with check (public.is_super() or public.can_manage_person(student_id));

drop policy if exists tenant on public.teacher_compensation;
create policy tenant on public.teacher_compensation for all to authenticated
  using (public.is_super() or public.can_manage_person(teacher_id))
  with check (public.is_super() or public.can_manage_person(teacher_id));

-- expenses: org_admin tüm kurum; branch_admin kendi eklediği veya şubesine ait
drop policy if exists tenant on public.expenses;
create policy tenant on public.expenses for all to authenticated
  using (
    public.is_super()
    or (public.my_role() = 'org_admin' and organization_id = public.my_org())
    or (public.my_role() = 'branch_admin' and (created_by = auth.uid()
        or (branch_id is not null and public.is_my_admin_branch(branch_id))))
  )
  with check (public.is_admin() and (public.is_super() or organization_id = public.my_org()));

-- subjects & agenda_notes & organizations: kurum seviyesinde kalır (0004'teki gibi).
