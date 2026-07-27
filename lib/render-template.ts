// Mesaj şablonu değişken doldurma (pure — client + server güvenli).

export const TEMPLATE_VARS: { key: string; label: string }[] = [
  { key: "ogrenci", label: "Öğrenci adı" },
  { key: "veli", label: "Veli adı" },
  { key: "bakiye", label: "Güncel bakiye" },
  { key: "ay", label: "Ödenmemiş ay sayısı" },
  { key: "kurum", label: "Kurum adı" },
];

export function renderTemplate(
  body: string,
  vars: Record<string, string>,
): string {
  return body.replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] !== undefined ? vars[k] : `{${k}}`,
  );
}
