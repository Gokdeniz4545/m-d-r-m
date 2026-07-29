import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  MakbuzBelgesi,
  MakbuzSayfa,
  MakbuzYok,
} from "@/components/makbuz/makbuz-belgesi";
import { EXPENSE_CATEGORY_LABEL } from "@/lib/expenses";

export default async function GiderMakbuz({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["org_admin", "branch_admin"]);
  const { id } = await params;
  const supabase = await createClient();

  const { data: exp } = await supabase
    .from("expenses")
    .select("id, category, amount, expense_date, note, teacher_id")
    .eq("id", id)
    .maybeSingle();
  if (!exp) return <MakbuzYok />;

  let odenenKisi: string | null = null;
  if (exp.teacher_id) {
    const { data: p } = await supabase
      .from("profiles")
      .select("full_name, username")
      .eq("id", exp.teacher_id)
      .maybeSingle();
    odenenKisi = p?.full_name ?? p?.username ?? null;
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .limit(1)
    .maybeSingle();

  const kategori = EXPENSE_CATEGORY_LABEL[exp.category] ?? exp.category;
  const tarih = new Date(exp.expense_date).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const satirlar: { label: string; value: string }[] = [
    { label: "Ödenen", value: odenenKisi ?? kategori },
  ];
  if (odenenKisi) satirlar.push({ label: "Tür", value: kategori });
  if (exp.note) satirlar.push({ label: "Açıklama", value: exp.note });

  return (
    <MakbuzSayfa>
      <MakbuzBelgesi
        baslik="GİDER / ÖDEME MAKBUZU"
        kurumAdi={org?.name ?? "Kurum"}
        altBaslik={null}
        tarih={tarih}
        satirlar={satirlar}
        tutar={Number(exp.amount)}
        solImza="Ödemeyi yapan"
        sagImza="Teslim alan"
      />
    </MakbuzSayfa>
  );
}
