import { createBrowserClient } from "@supabase/ssr";

// Tarayıcı (client component) tarafında kullanılan Supabase istemcisi.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
