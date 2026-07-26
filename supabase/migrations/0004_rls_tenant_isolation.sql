-- Müdürüm — Gerçek çok kiracılı RLS (Ünite 1 güvenlik)
-- Geçici "herkese açık" politikaların yerine kurum (organization) bazlı izolasyon.
-- Finansal tablolar (payments, expenses, teacher_compensation) yalnız yöneticiye.
--
-- Yardımcılar SECURITY DEFINER'dır (postgres sahipli → RLS'i bypass eder),
-- böylece profiles üzerindeki politika içinde profiles sorgulamak özyineleme yaratmaz.

-- ── Yardımcı fonksiyonlar ───────────────────────────────────────
create or replace function public.my_org() returns uuid
  language sql stable security definer set search_path = public as $$
  select organization_id from public.profiles where id = auth.uid()
$$;

create or replace function public.my_role() returns text
  language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_super() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() = 'super_admin', false)
$$;

create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() in ('super_admin','org_admin','branch_admin'), false)
$$;

create or replace function public.branch_in_my_org(bid uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.branches b
    where b.id = bid and b.organization_id = public.my_org()
  )
$$;

-- profil (öğrenci/öğretmen) benim kurumumda mı
create or replace function public.person_in_my_org(pid uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = pid and p.organization_id = public.my_org()
  )
$$;

create or replace function public.class_in_my_org(cid uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.classes c
    join public.branches b on b.id = c.branch_id
    where c.id = cid and b.organization_id = public.my_org()
  )
$$;

grant execute on function public.my_org() to authenticated, anon;
grant execute on function public.my_role() to authenticated, anon;
grant execute on function public.is_super() to authenticated, anon;
grant execute on function public.is_admin() to authenticated, anon;
grant execute on function public.branch_in_my_org(uuid) to authenticated, anon;
grant execute on function public.person_in_my_org(uuid) to authenticated, anon;
grant execute on function public.class_in_my_org(uuid) to authenticated, anon;

-- ── Politikalar ─────────────────────────────────────────────────
-- organizations
drop policy if exists auth_all on public.organizations;
create policy tenant on public.organizations for all to authenticated
  using (public.is_super() or id = public.my_org())
  with check (public.is_super());

-- branches
drop policy if exists auth_all on public.branches;
create policy tenant on public.branches for all to authenticated
  using (public.is_super() or organization_id = public.my_org())
  with check (public.is_admin() and (public.is_super() or organization_id = public.my_org()));

-- profiles: kendi kurumundakiler + kendi satırı
drop policy if exists auth_all on public.profiles;
create policy tenant on public.profiles for all to authenticated
  using (public.is_super() or organization_id = public.my_org() or id = auth.uid())
  with check (public.is_super() or organization_id = public.my_org());

-- branch_memberships
drop policy if exists auth_all on public.branch_memberships;
create policy tenant on public.branch_memberships for all to authenticated
  using (public.is_super() or public.branch_in_my_org(branch_id) or user_id = auth.uid())
  with check (public.is_super() or public.branch_in_my_org(branch_id));

-- subjects
drop policy if exists auth_all on public.subjects;
create policy tenant on public.subjects for all to authenticated
  using (public.is_super() or organization_id = public.my_org())
  with check (public.is_admin() and (public.is_super() or organization_id = public.my_org()));

-- classes
drop policy if exists auth_all on public.classes;
create policy tenant on public.classes for all to authenticated
  using (public.is_super() or public.branch_in_my_org(branch_id))
  with check (public.is_admin() and (public.is_super() or public.branch_in_my_org(branch_id)));

-- enrollments
drop policy if exists auth_all on public.enrollments;
create policy tenant on public.enrollments for all to authenticated
  using (public.is_super() or public.person_in_my_org(student_id))
  with check (public.is_super() or public.person_in_my_org(student_id));

-- schedule_slots
drop policy if exists auth_all on public.schedule_slots;
create policy tenant on public.schedule_slots for all to authenticated
  using (public.is_super() or public.class_in_my_org(class_id))
  with check (public.is_super() or public.class_in_my_org(class_id));

-- sessions
drop policy if exists auth_all on public.sessions;
create policy tenant on public.sessions for all to authenticated
  using (public.is_super() or public.class_in_my_org(class_id))
  with check (public.is_super() or public.class_in_my_org(class_id));

-- attendance
drop policy if exists auth_all on public.attendance;
create policy tenant on public.attendance for all to authenticated
  using (public.is_super() or public.person_in_my_org(student_id))
  with check (public.is_super() or public.person_in_my_org(student_id));

-- agenda_notes
drop policy if exists auth_all on public.agenda_notes;
create policy tenant on public.agenda_notes for all to authenticated
  using (public.is_super() or organization_id = public.my_org())
  with check (organization_id = public.my_org());

-- subscriptions: yönetici (kurum içi) + öğrenci kendi aboneliği
drop policy if exists auth_all on public.subscriptions;
create policy tenant on public.subscriptions for all to authenticated
  using (
    public.is_super()
    or student_id = auth.uid()
    or (public.is_admin() and public.person_in_my_org(student_id))
  )
  with check (public.is_admin() and (public.is_super() or public.person_in_my_org(student_id)));

-- payments: yalnız yönetici (kurum içi)
drop policy if exists auth_all on public.payments;
create policy tenant on public.payments for all to authenticated
  using (public.is_super() or (public.is_admin() and public.person_in_my_org(student_id)))
  with check (public.is_admin() and (public.is_super() or public.person_in_my_org(student_id)));

-- expenses: yalnız yönetici (kurum içi)
drop policy if exists auth_all on public.expenses;
create policy tenant on public.expenses for all to authenticated
  using (public.is_super() or (public.is_admin() and organization_id = public.my_org()))
  with check (public.is_admin() and (public.is_super() or organization_id = public.my_org()));

-- teacher_compensation: yalnız yönetici (kurum içi)
drop policy if exists auth_all on public.teacher_compensation;
create policy tenant on public.teacher_compensation for all to authenticated
  using (public.is_super() or (public.is_admin() and public.person_in_my_org(teacher_id)))
  with check (public.is_admin() and (public.is_super() or public.person_in_my_org(teacher_id)));
