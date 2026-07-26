import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role (secret) anahtarla çalışan, RLS'i atlayan istemci.
// YALNIZCA sunucu tarafında (server action / route handler) kullanılır.
// Kullanıcı oluşturma gibi yetkili işlemler için.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    throw new Error("Supabase admin yapılandırması eksik (URL veya SECRET KEY).");
  }
  return createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
