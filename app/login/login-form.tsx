"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

type LoginState = { error: string | null };
const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="label">
        Kullanıcı adı
        <input
          name="username"
          autoComplete="username"
          placeholder="kullanici.adi"
          required
          autoFocus
          className="input"
        />
      </label>

      <label className="label">
        Şifre
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
          className="input"
        />
      </label>

      {state.error ? (
        <p className="rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="btn-primary mt-1 w-full py-3">
        {pending ? "Giriş yapılıyor…" : "Giriş yap"}
      </button>
    </form>
  );
}
