"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function markAttendance(formData: FormData): Promise<void> {
  const p = await getSessionProfile();
  if (!p || !["org_admin", "branch_admin", "teacher"].includes(p.role)) return;

  const sessionId = String(formData.get("sessionId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!sessionId || !studentId) return;
  if (!["present", "absent", "excused", "late"].includes(status)) return;

  const supabase = await createClient();

  // Önceki durumu oku (telafi hakkı düşme/iade için)
  const { data: prev } = await supabase
    .from("attendance")
    .select("status")
    .eq("session_id", sessionId)
    .eq("student_id", studentId)
    .maybeSingle();
  const prevStatus = prev?.status ?? null;

  await supabase.from("attendance").upsert(
    {
      session_id: sessionId,
      student_id: studentId,
      status,
      recorded_by: p.id,
      recorded_at: new Date().toISOString(),
    },
    { onConflict: "session_id,student_id" },
  );

  // Telafi ders hakkı: "izinli"ye geçince 1 düş (min 0), izinliden çıkınca 1 iade.
  // subscriptions güncellemesi RLS'i aşmak için admin client ile (öğretmen de işaretleyebilir).
  const delta =
    status === "excused" && prevStatus !== "excused"
      ? -1
      : prevStatus === "excused" && status !== "excused"
        ? 1
        : 0;
  if (delta !== 0) {
    const admin = createAdminClient();
    const { data: sub } = await admin
      .from("subscriptions")
      .select("makeup_credits")
      .eq("student_id", studentId)
      .maybeSingle();
    if (sub) {
      const next = Math.max(0, (sub.makeup_credits ?? 0) + delta);
      await admin
        .from("subscriptions")
        .update({ makeup_credits: next })
        .eq("student_id", studentId);
    }
  }

  revalidatePath(`/oturum/${sessionId}`);
  revalidatePath(`/kisi/${studentId}`);
}
