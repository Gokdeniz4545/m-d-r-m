"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { usernameToEmail, ROLE_HOME, type UserRole } from "@/lib/roles";

export async function signIn(
  _prev: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Kullanıcı adı ve şifre gerekli." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  });

  if (error || !data.user) {
    return { error: "Kullanıcı adı veya şifre hatalı." };
  }

  const { data: prof } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", data.user.id)
    .single();

  if (!prof || !prof.is_active) {
    await supabase.auth.signOut();
    return { error: "Hesabınız aktif değil. Lütfen yöneticinizle görüşün." };
  }

  redirect(ROLE_HOME[prof.role as UserRole]);
}
