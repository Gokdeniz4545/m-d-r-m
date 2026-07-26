"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type State = { error: string | null; ok: boolean };

async function requireAdmin() {
  const p = await getSessionProfile();
  if (!p || !["org_admin", "branch_admin"].includes(p.role)) return null;
  return p;
}

export async function createSubject(
  _prev: State,
  formData: FormData,
): Promise<State> {
  const p = await requireAdmin();
  if (!p) return { error: "Yetki yok.", ok: false };

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Branş adı en az 2 karakter olmalı.", ok: false };

  const supabase = await createClient();
  const { error } = await supabase
    .from("subjects")
    .insert({ organization_id: p.organization_id, name });
  if (error) {
    if (error.code === "23505") return { error: "Bu branş zaten var.", ok: false };
    return { error: "Branş eklenemedi: " + error.message, ok: false };
  }
  revalidatePath("/dersler");
  return { error: null, ok: true };
}

export async function createClass(
  _prev: State,
  formData: FormData,
): Promise<State> {
  const p = await requireAdmin();
  if (!p) return { error: "Yetki yok.", ok: false };

  const branchId = String(formData.get("branchId") ?? "");
  const subjectId = String(formData.get("subjectId") ?? "");
  const teacherId = String(formData.get("teacherId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");

  if (!["one_on_one", "group"].includes(type)) {
    return { error: "Geçersiz ders tipi.", ok: false };
  }
  if (!branchId || !subjectId) {
    return { error: "Şube ve branş seçilmeli.", ok: false };
  }
  if (name.length < 2) return { error: "Ders adı en az 2 karakter olmalı.", ok: false };

  let capacity = 1;
  if (type === "group") {
    const parsed = parseInt(String(formData.get("capacity") ?? ""), 10);
    capacity = Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("classes").insert({
    branch_id: branchId,
    subject_id: subjectId,
    teacher_id: teacherId || null,
    name,
    type,
    capacity,
  });
  if (error) return { error: "Ders oluşturulamadı: " + error.message, ok: false };

  revalidatePath("/dersler");
  return { error: null, ok: true };
}

export async function enrollStudent(
  _prev: State,
  formData: FormData,
): Promise<State> {
  const p = await requireAdmin();
  if (!p) return { error: "Yetki yok.", ok: false };

  const classId = String(formData.get("classId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  if (!classId || !studentId) return { error: "Ders ve öğrenci seçilmeli.", ok: false };

  const supabase = await createClient();
  const { data: cls } = await supabase
    .from("classes")
    .select("id, branch_id, capacity")
    .eq("id", classId)
    .maybeSingle();
  if (!cls) return { error: "Ders bulunamadı.", ok: false };

  const { data: mem } = await supabase
    .from("branch_memberships")
    .select("id")
    .eq("user_id", studentId)
    .eq("branch_id", cls.branch_id)
    .maybeSingle();
  if (!mem) return { error: "Öğrenci bu şubeye kayıtlı değil.", ok: false };

  const { count } = await supabase
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("class_id", classId);
  if ((count ?? 0) >= cls.capacity) {
    return { error: "Kontenjan dolu.", ok: false };
  }

  const { error } = await supabase
    .from("enrollments")
    .insert({ class_id: classId, student_id: studentId });
  if (error) {
    if (error.code === "23505") return { error: "Öğrenci zaten kayıtlı.", ok: false };
    return { error: "Kayıt yapılamadı: " + error.message, ok: false };
  }

  revalidatePath(`/dersler/${classId}`);
  return { error: null, ok: true };
}

export async function unenroll(formData: FormData): Promise<void> {
  const p = await requireAdmin();
  if (!p) return;

  const enrollmentId = String(formData.get("enrollmentId") ?? "");
  const classId = String(formData.get("classId") ?? "");
  if (!enrollmentId) return;

  const supabase = await createClient();
  await supabase.from("enrollments").delete().eq("id", enrollmentId);
  if (classId) revalidatePath(`/dersler/${classId}`);
}

// Dersi düzenle (ad + kontenjan)
export async function updateClass(formData: FormData): Promise<void> {
  const p = await requireAdmin();
  if (!p) return;
  const classId = String(formData.get("classId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const capRaw = parseInt(String(formData.get("capacity") ?? ""), 10);
  if (!classId || name.length < 2) return;
  const capacity = Number.isFinite(capRaw) && capRaw >= 1 ? capRaw : 1;

  const supabase = await createClient();
  await supabase.from("classes").update({ name, capacity }).eq("id", classId);
  revalidatePath(`/dersler/${classId}`);
}

// Derse öğretmen ekle (çoklu)
export async function addClassTeacher(formData: FormData): Promise<void> {
  const p = await requireAdmin();
  if (!p) return;
  const classId = String(formData.get("classId") ?? "");
  const teacherId = String(formData.get("teacherId") ?? "");
  if (!classId || !teacherId) return;
  const supabase = await createClient();
  await supabase
    .from("class_teachers")
    .insert({ class_id: classId, teacher_id: teacherId });
  revalidatePath(`/dersler/${classId}`);
}

export async function removeClassTeacher(formData: FormData): Promise<void> {
  const p = await requireAdmin();
  if (!p) return;
  const classId = String(formData.get("classId") ?? "");
  const teacherId = String(formData.get("teacherId") ?? "");
  if (!classId || !teacherId) return;
  const supabase = await createClient();
  await supabase
    .from("class_teachers")
    .delete()
    .eq("class_id", classId)
    .eq("teacher_id", teacherId);
  revalidatePath(`/dersler/${classId}`);
}

// Öğretmene branş ata / kaldır
export async function addTeacherSubject(formData: FormData): Promise<void> {
  const p = await requireAdmin();
  if (!p) return;
  const teacherId = String(formData.get("teacherId") ?? "");
  const subjectId = String(formData.get("subjectId") ?? "");
  if (!teacherId || !subjectId) return;
  const supabase = await createClient();
  await supabase
    .from("teacher_subjects")
    .insert({ teacher_id: teacherId, subject_id: subjectId });
  revalidatePath(`/kisi/${teacherId}`);
}

export async function removeTeacherSubject(formData: FormData): Promise<void> {
  const p = await requireAdmin();
  if (!p) return;
  const teacherId = String(formData.get("teacherId") ?? "");
  const subjectId = String(formData.get("subjectId") ?? "");
  if (!teacherId || !subjectId) return;
  const supabase = await createClient();
  await supabase
    .from("teacher_subjects")
    .delete()
    .eq("teacher_id", teacherId)
    .eq("subject_id", subjectId);
  revalidatePath(`/kisi/${teacherId}`);
}
