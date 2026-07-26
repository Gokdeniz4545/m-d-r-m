"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { setUserActive, setUserPassword } from "@/lib/user-admin";

type State = { error: string | null; ok: boolean };

function revalidatePanels() {
  revalidatePath("/kurum");
  revalidatePath("/sube");
  revalidatePath("/super");
}

export async function toggleActiveAction(
  _prev: State,
  formData: FormData,
): Promise<State> {
  const actor = await getSessionProfile();
  if (!actor) return { error: "Oturum bulunamadı.", ok: false };

  const userId = String(formData.get("userId") ?? "");
  const next = String(formData.get("next") ?? "") === "true";

  const res = await setUserActive(actor, userId, next);
  if (!res.ok) return { error: res.error, ok: false };

  revalidatePanels();
  return { error: null, ok: true };
}

export async function resetPasswordAction(
  _prev: State,
  formData: FormData,
): Promise<State> {
  const actor = await getSessionProfile();
  if (!actor) return { error: "Oturum bulunamadı.", ok: false };

  const userId = String(formData.get("userId") ?? "");
  const password = String(formData.get("password") ?? "");

  const res = await setUserPassword(actor, userId, password);
  if (!res.ok) return { error: res.error, ok: false };

  revalidatePanels();
  return { error: null, ok: true };
}
