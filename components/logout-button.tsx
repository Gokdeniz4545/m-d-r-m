import { signOut } from "@/lib/auth-actions";

export function LogoutButton() {
  return (
    <form action={signOut} className="flex-1">
      <button type="submit" className="btn-ghost w-full">
        Çıkış
      </button>
    </form>
  );
}
