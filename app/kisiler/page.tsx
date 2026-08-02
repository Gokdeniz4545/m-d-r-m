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
    people = rows.filter(
      (p) => p.role === "student" && new Date(p.created_at) >= today,
    );

  people.sort((a, b) =>
    (a.full_name ?? a.username).localeCompare(b.full_name ?? b.username, "tr"),
  );

  const ids = people.map((p) => p.id);

  // Şubeler
  const userBranches = new Map<string, string[]>();
  // Öğretmen/öğrenci adı metadatası (arama için)
  const studentTeacher = new Map<string, string>();
  const teacherStudentNames = new Map<string, string[]>();

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

    // Öğrenci kayıtlarının öğretmen adı + öğretmen kayıtlarının öğrenci adları
    const { data: studs } = await supabase
      .from("profiles")
      .select("id, teacher_id")
      .in("id", ids)
      .eq("role", "student");
    const teacherIdsInList = people
      .filter((p) => p.role === "teacher")
      .map((p) => p.id);
    const refTeacherIds = [
      ...new Set([
        ...((studs ?? []).map((s) => s.teacher_id).filter(Boolean) as string[]),
        ...teacherIdsInList,
      ]),
    ];
    const tName = new Map<string, string>();
    if (refTeacherIds.length > 0) {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, username")
        .in("id", refTeacherIds);
      (data ?? []).forEach((t) => tName.set(t.id, t.full_name ?? t.username));
    }
    (studs ?? []).forEach((s) => {
      if (s.teacher_id) studentTeacher.set(s.id, tName.get(s.teacher_id) ?? "");
    });
    if (teacherIdsInList.length > 0) {
      const { data: theirStudents } = await supabase
        .from("profiles")
        .select("id, full_name, username, teacher_id")
        .in("teacher_id", teacherIdsInList)
        .eq("role", "student");
      (theirStudents ?? []).forEach((s) => {
        if (!s.teacher_id) return;
        const a = teacherStudentNames.get(s.teacher_id) ?? [];
        a.push(s.full_name ?? s.username);
        teacherStudentNames.set(s.teacher_id, a);
      });
    }
  }

  const peopleOut = people.map((p) => {
    const parts: string[] = [p.full_name ?? "", p.username];
    (userBranches.get(p.id) ?? []).forEach((b) => parts.push(b));
    const t = studentTeacher.get(p.id);
    if (t) parts.push(t);
    (teacherStudentNames.get(p.id) ?? []).forEach((n) => parts.push(n));
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
