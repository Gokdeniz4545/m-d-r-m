// Client-güvenli sabitler ve tipler (server importu YOK — hem client hem
// server bileşenlerinden kullanılabilir).

export const EXPENSE_CATEGORIES = [
  { value: "kira", label: "Kira" },
  { value: "fatura", label: "Fatura" },
  { value: "vergi", label: "Vergi" },
  { value: "maas", label: "Maaş / Hakediş" },
  { value: "malzeme", label: "Malzeme" },
  { value: "diger", label: "Diğer" },
] as const;

// Vade tarihi girilebilen (fatura/vergi) kategoriler
export const DUE_DATE_CATEGORIES = ["fatura", "vergi"];

export const EXPENSE_CATEGORY_LABEL: Record<string, string> =
  Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.value, c.label]));

export type ExpenseRow = {
  id: string;
  category: string;
  amount: number;
  expense_date: string;
  due_date: string | null;
  note: string | null;
  teacher_id: string | null;
};
