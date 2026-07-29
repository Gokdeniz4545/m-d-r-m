import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PanelShell } from "@/components/panel-shell";
import { PeopleSearch } from "@/components/people-search";
import type { UserRole } from "@/lib/roles";

const TITLES: Record<string, string> = {
  "aktif-ogrenci": "Aktif öğrenciler",
  ogrenci: "Öğrenciler",
  ogretmen: "Öğretmenler",
  personel: "Personel",
  yeni: "Bugünün yeni kayıtları",
};

type ProfileRow = {
  id: string;
  username: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
};

export default async function KisilerPage({
  searchParams,
}: {
  searchParams: Promise<{ tip?: string; sube?: string }>;
}) {
  const profile = await requireRole(["org_admin", "branch_admin"]);
  const { tip = "ogrenci", sube } = await searchParams;
  const supabase = await createClient();

  let rows: ProfileRow[] = [];
  if (sube) {
    const { data: mems } = await supabase
      .from("branch_memberships")
      .select("user_id")
      .eq("branch_id", sube);
    const ids = [...new Set((mems ?? []).map((m) => m.user_id))];
    if (ids.length > 0) {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, full_name, role, is_active, created_at")
        .in("id", ids);
      rows = (data ?? []) as ProfileRow[];
    }
  } else {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, full_name, role, is_active, created_at")
      .neq("role", "org_admin")
      .neq("role", "super_admin");
    rows = (data ?? []) as ProfileRow[];
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let people = rows;
  if (tip === "aktif-ogrenci")
    people = rows.filter((p) => p.role === "student" && p.is_active);
  else if (tip === "ogrenci") people = rows.filter((p) => p.role === "student");
  else if (tip === "ogretmen") people = rows.filter((p) => p.role === "teacher");
  else if (tip === "personel") people = rows.filter((p) => p.role === "staff");
  else if (tip === "yeni")
    people = rows.filter((p) => new Date(p.created_at) >= today);

  people.sort((a, b) =>
    (a.full_name ?? a.username).localeCompare(b.full_name ?? b.username, "tr"),
  );

  const ids = people.map((p) => p.id);

  // Şubeler
  const userBranches = new Map<string, string[]>();
  // Ders/öğretmen/branş metadatası (arama için)
  const studentClassIds = new Map<string, string[]>();
  const teacherClassIds = new Map<string, string[]>();
  const allClassIds = new Set<string>();

  if (ids.length > 0) {
    const { data: mems } = await supabase
      .from("branch_memberships")
      .select("user_id, branch_id")
      .in("user_id", ids);
    const branchIds = [...new Set((mems ?? []).map((m) => m.branch_id))];
    const branchName = new Map<string, string>();
    if (branchIds.length > 0) {
      const { data: brs } = await supabase
        .from("branches")
        .select("id, name")
        .in("id", branchIds);
      (brs ?? []).forEach((b) => branchName.set(b.id, b.name));
    }
    (mems ?? []).forEach((m) => {
      const name = branchName.get(m.branch_id);
      if (!name) return;
      const arr = userBranches.get(m.user_id) ?? [];
      arr.push(name);
      userBranches.set(m.user_id, arr);
    });

    const { data: enr } = await supabase
      .from("enrollments")
      .select("student_id, class_id")
      .in("student_id", ids);
    (enr ?? []).forEach((e) => {
      const a = studentClassIds.get(e.student_id) ?? [];
      a.push(e.class_id);
      studentClassIds.set(e.student_id, a);
      allClassIds.add(e.class_id);
    });

    const { data: tcls } = await supabase
      .from("classes")
      .select("id, teacher_id")
      .in("teacher_id", ids);
    (tcls ?? []).forEach((c) => {
      if (!c.teacher_id) return;
      const a = teacherClassIds.get(c.teacher_id) ?? [];
      a.push(c.id);
      teacherClassIds.set(c.teacher_id, a);
      allClassIds.add(c.id);
    });
  }

  const classMeta = new Map<
    string,
    { name: string; subjectId: string; teacherId: string | null }
  >();
  if (allClassIds.size > 0) {
    const { data } = await supabase
      .from("classes")
      .select("id, name, subject_id, teacher_id")
      .in("id", [...allClassIds]);
    (data ?? []).forEach((c) =>
      classMeta.set(c.id, {
        name: c.name,
        subjectId: c.subject_id,
        teacherId: c.teacher_id,
      }),
    );
  }
  const subjectIds = new Set<string>();
  const teacherIds = new Set<string>();
  classMeta.forEach((c) => {
    subjectIds.add(c.subjectId);
    if (c.teacherId) teacherIds.add(c.teacherId);
  });
  const subjectName = new Map<string, string>();
  if (subjectIds.size > 0) {
    const { data } = await supabase
      .from("subjects")
      .select("id, name")
      .in("id", [...subjectIds]);
    (data ?? []).forEach((s) => subjectName.set(s.id, s.name));
  }
  const teacherName = new Map<string, string>();
  if (teacherIds.size > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, username")
      .in("id", [...teacherIds]);
    (data ?? []).forEach((p) => teacherName.set(p.id, p.full_name ?? p.username));
  }

  const peopleOut = people.map((p) => {
    const parts: string[] = [p.full_name ?? "", p.username];
    (userBranches.get(p.id) ?? []).forEach((b) => parts.push(b));
    const cids = [
      ...(studentClassIds.get(p.id) ?? []),
      ...(teacherClassIds.get(p.id) ?? []),
    ];
    cids.forEach((cid) => {
      const c = classMeta.get(cid);
      if (!c) return;
      parts.push(c.name);
      parts.push(subjectName.get(c.subjectId) ?? "");
      if (c.teacherId) parts.push(teacherName.get(c.teacherId) ?? "");
    });
    return {
      id: p.id,
      name: p.full_name ?? p.username,
      username: p.username,
      role: p.role,
      branch: (userBranches.get(p.id) ?? []).join(", "),
      isActive: p.is_active,
      search: parts.join(" ").toLocaleLowerCase("tr"),
    };
  });

  const backHref = profile.role === "org_admin" ? "/kurum" : "/sube";

  return (
    <PanelShell title={TITLES[tip] ?? "Kişiler"} profile={profile}>
      <Link
        href={backHref}
        className="mb-4 inline-block text-sm text-muted hover:underline"
      >
        ← Panele dön
      </Link>
      {peopleOut.length > 0 ? (
        <PeopleSearch people={peopleOut} />
      ) : (
        <p className="text-sm text-muted">Kayıt bulunamadı.</p>
      )}
    </PanelShell>
  );
}
