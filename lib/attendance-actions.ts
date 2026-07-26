"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function markAttendance(formData: FormData): Promise<void> {
  const p = await getSessionProfile();
  if (!p || !["org_admin", "branch_admin", "teacher"].includes(p.role)) return;

  const sessionId = String(formData.get("sessionId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!sessionId || !studentId) return;
  if (!["present", "absent", "excused", "late"].includes(status)) return;

  const supabase = await createClient();
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

  revalidatePath(`/oturum/${sessionId}`);
}
