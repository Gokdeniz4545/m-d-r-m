"use client";

import { useActionState, useState } from "react";
import { toggleActiveAction, resetPasswordAction } from "@/lib/manage-actions";
import { ROLE_LABEL, NON_LOGIN_ROLES, type UserRole } from "@/lib/roles";

type State = { error: string | null; ok: boolean };
const initial: State = { error: null, ok: false };

export type ManageUser = {
  id: string;
  username: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
};

export function UserManageRow({
  user,
  branchesText,
}: {
  user: ManageUser;
  branchesText: string;
}) {
  const [tState, tAction, tPending] = useActionState(toggleActiveAction, initial);
  const [pState, pAction, pPending] = useActionState(resetPasswordAction, initial);
  const [showPw, setShowPw] = useState(false);
  const canLogin = !NON_LOGIN_ROLES.includes(user.role);

  const badge = user.is_active
    ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300"
    : "rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400";
  const smallBtn =
    "rounded-lg border border-border bg-card px-2 py-1 text-xs font-medium text-foreground transition hover:bg-accent disabled:opacity-60";

  return (
    <div className="card p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-medium text-zinc-900 dark:text-zinc-50">
            {user.full_name ?? user.username}
            {canLogin ? (
              <span className="ml-1 text-sm font-normal text-zinc-500">
                ({user.username})
              </span>
            ) : null}
          </div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            {ROLE_LABEL[user.role]}
            {branchesText ? " · " + branchesText : ""}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={badge}>{user.is_active ? "Aktif" : "Pasif"}</span>
          <form action={tAction}>
            <input type="hidden" name="userId" value={user.id} />
            <input type="hidden" name="next" value={(!user.is_active).toString()} />
            <button type="submit" disabled={tPending} className={smallBtn}>
              {user.is_active ? "Pasif yap" : "Aktif yap"}
            </button>
          </form>
          {canLogin ? (
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className={smallBtn}
            >
              Şifre
            </button>
          ) : null}
        </div>
      </div>

      {showPw && canLogin ? (
        <form action={pAction} className="mt-2 flex items-center gap-2">
          <input type="hidden" name="userId" value={user.id} />
          <input
            name="password"
            type="text"
            placeholder="Yeni şifre (en az 8 karakter)"
            className="input flex-1 py-1 text-sm"
          />
          <button
            type="submit"
            disabled={pPending}
            className="btn-primary px-3 py-1.5 text-xs"
          >
            {pPending ? "..." : "Sıfırla"}
          </button>
        </form>
      ) : null}

      {tState.error ? (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{tState.error}</p>
      ) : null}
      {pState.error ? (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{pState.error}</p>
      ) : null}
      {pState.ok ? (
        <p className="mt-1 text-xs text-green-600 dark:text-green-400">
          Şifre güncellendi.
        </p>
      ) : null}
    </div>
  );
}
