import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  MakbuzBelgesi,
  MakbuzSayfa,
  MakbuzYok,
} from "@/components/makbuz/makbuz-belgesi";

export default async function TahsilatMakbuz({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["org_admin", "branch_admin"]);
  const { id } = await params;
  const supabase = await createClient();

  const { data: pay } = await supabase
    .from("payments")
    .select("id, amount, period_month, paid_at, note, student_id, received_by")
    .eq("id", id)
    .maybeSingle();
  if (!pay) return <MakbuzYok />;

  const { data: student } = await supabase
    .from("profiles")
    .select("full_name, username, guardian_name, teacher_id")
    .eq("id", pay.student_id)
    .maybeSingle();

  // Öğretmen adı + ders adedi (plan)
  let teacherName: string | null = null;
  if (student?.teacher_id) {
    const { data: t } = await supabase
      .from("profiles")
      .select("full_name, username")
      .eq("id", student.teacher_id)
      .maybeSingle();
    teacherName = t ? (t.full_name ?? t.username) : null;
  }
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("monthly_quota")
    .eq("student_id", pay.student_id)
    .maybeSingle();
  const dersAdedi = sub?.monthly_quota ?? null;

  // Öğrencinin şubesi (başlıkta kurum + şube bilgisi)
  let subeAdi: string | null = null;
  let subeAdres: string | null = null;
  let subeTel: string | null = null;
  const { data: mem } = await supabase
    .from("branch_memberships")
    .select("branch_id")
    .eq("user_id", pay.student_id)
    .limit(1)
    .maybeSingle();
  if (mem?.branch_id) {
    const { data: br } = await supabase
      .from("branches")
      .select("name, address, phone")
      .eq("id", mem.branch_id)
      .maybeSingle();
    subeAdi = br?.name ?? null;
    subeAdres = br?.address ?? null;
    subeTel = br?.phone ?? null;
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .limit(1)
    .maybeSingle();

  const ogrenciAdi = student?.full_name ?? student?.username ?? "—";
  // Anlık gün + saat
  const tarih = new Date(pay.paid_at).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const altBaslik =
    [subeAdi, subeAdres, subeTel].filter(Boolean).join(" · ") || null;

  const satirlar: { label: string; value: string }[] = [];
  satirlar.push({ label: "Öğrenci", value: ogrenciAdi });
  if (teacherName) satirlar.push({ label: "Öğretmen", value: teacherName });
  if (dersAdedi != null)
    satirlar.push({ label: "Ders adedi", value: `${dersAdedi} ders` });
  if (pay.note) satirlar.push({ label: "Açıklama", value: pay.note });
  if (pay.received_by)
    satirlar.push({ label: "Ödemeyi alan", value: pay.received_by });

  return (
    <MakbuzSayfa>
      <MakbuzBelgesi
        baslik="TAHSİLAT MAKBUZU"
        kurumAdi={org?.name ?? "Kurum"}
        altBaslik={altBaslik}
        tarih={tarih}
        satirlar={satirlar}
        tutar={Number(pay.amount)}
        solImza="Teslim eden"
        sagImza="Teslim alan"
      />
    </MakbuzSayfa>
  );
}
