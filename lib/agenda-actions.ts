"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type State = { error: string | null; ok: boolean };

export async function addNote(
  _prev: State,
  formData: FormData,
): Promise<State> {
  const p = await getSessionProfile();
  if (!p || p.role === "student" || !p.organization_id) {
    return { error: "Yetki yok.", ok: false };
  }
  const body = String(formData.get("body") ?? "").trim();
  if (body.length < 1) return { error: "Not boş olamaz.", ok: false };

  const supabase = await createClient();
  const { error } = await supabase.from("agenda_notes").insert({
    organization_id: p.organization_id,
    author_id: p.id,
    author_name: p.full_name ?? p.username,
    author_role: p.role,
    body,
  });
  if (error) return { error: "Not eklenemedi: " + error.message, ok: false };

  revalidatePath("/gundem");
  return { error: null, ok: true };
}

export async function deleteNote(formData: FormData): Promise<void> {
  const p = await getSessionProfile();
  if (!p) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("agenda_notes").delete().eq("id", id);
  revalidatePath("/gundem");
}
