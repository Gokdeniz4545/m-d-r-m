"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addExpense } from "@/lib/expense-actions";
import { EXPENSE_CATEGORIES, DUE_DATE_CATEGORIES } from "@/lib/expenses";
import { Field } from "@/components/ui/field";

type State = { error: string | null; ok: boolean };
const initial: State = { error: null, ok: false };

export function ExpenseForm({
  teachers,
  staff,
}: {
  teachers: { id: string; name: string }[];
  staff: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(addExpense, initial);
  const [category, setCategory] = useState("kira");
  const ref = useRef<HTMLFormElement>(null);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      setCategory("kira");
    }
  }, [state.ok]);

  return (
    <form ref={ref} action={action} className="flex flex-wrap items-end gap-3">
      <label className="label">
        Kategori
        <select
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="input"
        >
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      {category === "maas" ? (
        <label className="label">
          Kime (öğretmen / diğer)
          <select name="teacher_id" className="input" defaultValue="">
            <option value="">— seçin —</option>
            {teachers.length > 0 ? (
              <optgroup label="Öğretmenler">
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {staff.length > 0 ? (
              <optgroup label="Diğer personel">
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </select>
        </label>
      ) : null}

      <Field label="Tutar (₺)" name="amount" type="number" />
      <label className="label">
        Tarih
        <input
          type="date"
          name="expense_date"
          defaultValue={today}
          className="input"
        />
      </label>
      {DUE_DATE_CATEGORIES.includes(category) ? (
        <label className="label">
          Son ödeme tarihi
          <input type="date" name="due_date" className="input" />
        </label>
      ) : null}
      <Field label="Not (isteğe bağlı)" name="note" />

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "..." : "Gider ekle"}
      </button>

      {state.error ? (
        <p className="w-full text-sm text-danger">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="w-full text-sm text-emerald-600 dark:text-emerald-400">
          Gider eklendi.
        </p>
      ) : null}
    </form>
  );
}
