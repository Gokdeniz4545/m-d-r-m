import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/roles";

export default async function Home() {
  const profile = await getSessionProfile();
  redirect(profile ? ROLE_HOME[profile.role] : "/login");
}
