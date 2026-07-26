import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PanelShell } from "@/components/panel-shell";
import { ROLE_LABEL, type UserRole } from "@/lib/roles";
import { NoteForm } from "@/components/gundem/note-form";
import { deleteNote } from "@/lib/agenda-actions";

export default async function GundemPage() {
  const profile = await requireRole(["org_admin", "branch_admin", "teacher"]);
  const supabase = await createClient();

  const { data: notes } = await supabase
    .from("agenda_notes")
    .select("id, author_id, author_name, author_role, body, created_at")
    .order("created_at", { ascending: false });

  return (
    <PanelShell title="Kurum İçi Gündem" profile={profile}>
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        <NoteForm />

        {notes && notes.length > 0 ? (
          <div className="flex flex-col gap-3">
            {notes.map((n) => (
              <div key={n.id} className="card p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold">
                    {n.author_name}{" "}
                    <span className="font-normal text-muted">
                      · {ROLE_LABEL[n.author_role as UserRole]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted">
                      {new Date(n.created_at).toLocaleString("tr-TR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {n.author_id === profile.id || profile.role === "org_admin" ? (
                      <form action={deleteNote}>
                        <input type="hidden" name="id" value={n.id} />
                        <button
                          type="submit"
                          className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                        >
                          Sil
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm">{n.body}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Henüz not yok. İlk notu sen bırak.</p>
        )}
      </div>
    </PanelShell>
  );
}
