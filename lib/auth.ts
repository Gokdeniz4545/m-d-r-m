import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLE_HOME, type Profile, type UserRole } from "@/lib/roles";

// Oturumdaki kullanıcının profilini döndürür (yoksa null).
export async function getSessionProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (data as Profile | null) ?? null;
}

// Sayfayı yalnızca izin verilen roller için açar; aksi halde yönlendirir.
export async function requireRole(allowed: UserRole[]): Promise<Profile> {
  const profile = await getSessionProfile();
  if (!profile || !profile.is_active) redirect("/login");
  if (!allowed.includes(profile.role)) redirect(ROLE_HOME[profile.role]);
  return profile;
}
