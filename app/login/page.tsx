import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/roles";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/wordmark";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const profile = await getSessionProfile();
  if (profile) redirect(ROLE_HOME[profile.role]);

  return (
    <div className="relative flex min-h-screen flex-1 flex-col items-center justify-center p-6">
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center gap-4 text-center">
          <Wordmark size="lg" />
          <p className="text-sm text-muted">Okulunuzu yönetmek için giriş yapın</p>
        </div>

        <div className="card p-7">
          <LoginForm />
        </div>

        <p className="mt-5 text-center text-xs text-muted">
          Öğrenci takibi · Muhasebe · Kurum yönetimi
        </p>
      </div>
    </div>
  );
}
