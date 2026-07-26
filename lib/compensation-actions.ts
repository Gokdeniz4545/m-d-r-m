"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type State = { error: string | null; ok: boolean };

function num(v: FormDataEntryValue | null): number {
  return Number(String(v ?? "").replace(",", "."));
}

async function requireAdmin() {
  const p = await getSessionProfile();
  if (!p || !["org_admin", "branch_admin"].includes(p.role)) return null;
  return p;
}

export async function setCompensation(
  _prev: State,
  formData: FormData,
): Promise<State> {
  if (!(await requireAdmin())) return { error: "Yetki yok.", ok: false };

  const teacherId = String(formData.get("teacherId") ?? "");
  const compType = String(formData.get("comp_type") ?? "");
  const rate = num(formData.get("rate"));

  if (!teacherId) return { error: "Öğretmen yok.", ok: false };
  if (!["per_session", "monthly"].includes(compType))
    return { error: "Ücret tipi seçin.", ok: false };
  if (!(rate >= 0)) return { error: "Geçerli ücret girin.", ok: false };

  const supabase = await createClient();
  const { error } = await supabase.from("teacher_compensation").upsert(
    {
      teacher_id: teacherId,
      comp_type: compType,
      rate,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "teacher_id" },
  );
  if (error)
    return { error: "Hakediş ayarı kaydedilemedi: " + error.message, ok: false };

  revalidatePath(`/kisi/${teacherId}`);
  return { error: null, ok: true };
}
