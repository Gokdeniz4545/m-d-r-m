"use server";

import { getSessionProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAppUser } from "@/lib/user-admin";

export type RowResult = {
  line: number;
  name: string;
  status: "ok" | "error";
  message: string;
};
export type ImportState = {
  error: string | null;
  rows: RowResult[];
  created: number;
  mode: "preview" | "import" | null;
};

const norm = (s: string) => s.trim().toLocaleLowerCase("tr").replace(/\s+/g, " ");

const HEADERS: Record<string, string[]> = {
  name: ["ad soyad", "ad_soyad", "isim", "öğrenci", "ogrenci", "ad"],
  phone: ["telefon", "tel"],
  guardianName: ["veli", "veli adı", "veli_adi", "veli adi"],
  guardianPhone: ["veli telefon", "veli_telefon", "veli tel"],
  branch: ["şube", "sube"],
  subject: ["branş", "brans", "ders", "branş adı"],
  monthlyFee: ["aylık ücret", "aylik_ucret", "ücret", "ucret", "aylik ucret"],
  monthlyQuota: ["aylık ders", "aylik_ders", "kota", "ders hakkı"],
  weekday: ["gün", "gun", "ders günü"],
  startTime: ["saat", "başlangıç", "baslangic", "ders saati"],
  openingUsed: ["devir", "kullanılan", "devir_kullanilan", "önceden kullanılmış"],
  openingBalance: ["açılış bakiye", "acilis_bakiye", "bakiye", "borç", "devir bakiye"],
};

const DAYS = [
  "pazartesi",
  "salı",
  "çarşamba",
  "perşembe",
  "cuma",
  "cumartesi",
  "pazar",
];

function parseWeekday(v: string): number {
  const n = parseInt(v, 10);
  if (n >= 1 && n <= 7) return n;
  const i = DAYS.indexOf(norm(v));
  return i >= 0 ? i + 1 : 0;
}
function normTime(v: string): string {
  const m = v.replace(".", ":").match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "";
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}
function addHour(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${String((h + 1) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { headers: [], rows: [] };
  const delim = lines[0].split(";").length > lines[0].split(",").length ? ";" : ",";
  const split = (l: string) =>
    l.split(delim).map((c) => c.trim().replace(/^"|"$/g, ""));
  return { headers: split(lines[0]).map(norm), rows: lines.slice(1).map(split) };
}
function colIndex(headers: string[], keys: string[]): number {
  for (const k of keys) {
    const i = headers.indexOf(norm(k));
    if (i >= 0) return i;
  }
  return -1;
}

export async function importStudents(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const actor = await getSessionProfile();
  if (!actor || actor.role !== "org_admin" || !actor.organization_id) {
    return { error: "Yetki yok (kurum yöneticisi gerekli).", rows: [], created: 0, mode: null };
  }
  const mode = (String(formData.get("mode") ?? "preview") === "import"
    ? "import"
    : "preview") as "preview" | "import";
  const csv = String(formData.get("csv") ?? "");

  const { headers, rows } = parseCsv(csv);
  if (headers.length === 0) {
    return { error: "CSV boş veya başlık satırı yok.", rows: [], created: 0, mode };
  }
  const idx: Record<string, number> = {};
  for (const [field, keys] of Object.entries(HEADERS)) idx[field] = colIndex(headers, keys);
  if (idx.name < 0) {
    return { error: "'Ad soyad' sütunu bulunamadı.", rows: [], created: 0, mode };
  }

  const admin = createAdminClient();
  const { data: branches } = await admin
    .from("branches")
    .select("id, name")
    .eq("organization_id", actor.organization_id);
  const branchByName = new Map((branches ?? []).map((b) => [norm(b.name), b.id]));
  const singleBranch = (branches ?? []).length === 1 ? branches![0].id : null;

  const now = new Date();
  const curPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const today = ymd(now);

  const results: RowResult[] = [];
  let created = 0;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const line = r + 2;
    const get = (f: string) => (idx[f] >= 0 ? (row[idx[f]] ?? "").trim() : "");
    const name = get("name");
    if (!name) {
      results.push({ line, name: "(boş)", status: "error", message: "Ad soyad boş." });
      continue;
    }
    const branchName = get("branch");
    let branchId = branchName ? (branchByName.get(norm(branchName)) ?? null) : null;
    if (!branchId) branchId = singleBranch;
    if (!branchId) {
      results.push({
        line,
        name,
        status: "error",
        message: branchName ? `Şube bulunamadı: ${branchName}` : "Şube belirtilmemiş.",
      });
      continue;
    }

    const phone = get("phone");
    const guardianName = get("guardianName");
    const guardianPhone = get("guardianPhone");
    const subjectName = get("subject") || "Genel";
    const monthlyFee = Number((get("monthlyFee") || "0").replace(",", ".")) || 0;
    const monthlyQuota = parseInt(get("monthlyQuota") || "0", 10) || 0;
    const weekday = parseWeekday(get("weekday"));
    const startTime = normTime(get("startTime"));
    const openingUsed = parseInt(get("openingUsed") || "0", 10) || 0;
    const openingBalance = Number((get("openingBalance") || "0").replace(",", ".")) || 0;

    if (mode === "preview") {
      const parts = [
        branchName || "şube",
        subjectName,
        `${monthlyFee}₺/${monthlyQuota} ders`,
      ];
      if (weekday) parts.push(`${DAYS[weekday - 1]} ${startTime || ""}`.trim());
      if (openingUsed) parts.push(`devir ${openingUsed} ders`);
      if (openingBalance) parts.push(`açılış ${openingBalance}₺`);
      results.push({ line, name, status: "ok", message: parts.join(" · ") });
      continue;
    }

    // --- gerçek içe aktarım ---
    const username = "ogr." + crypto.randomUUID().replace(/-/g, "").slice(0, 10);
    const password = crypto.randomUUID().replace(/-/g, "");
    const userRes = await createAppUser({
      username,
      password,
      fullName: name,
      phone,
      guardianName,
      guardianPhone,
      notifyConsent: true,
      role: "student",
      organizationId: actor.organization_id,
      branchIds: [branchId],
    });
    if (!userRes.ok) {
      results.push({ line, name, status: "error", message: userRes.error });
      continue;
    }
    const studentId = userRes.userId;

    // branş (varsa kullan, yoksa oluştur)
    let subjectId: string | undefined;
    const { data: exSub } = await admin
      .from("subjects")
      .select("id")
      .eq("organization_id", actor.organization_id)
      .ilike("name", subjectName)
      .maybeSingle();
    if (exSub) subjectId = exSub.id;
    else {
      const { data: newSub } = await admin
        .from("subjects")
        .insert({ organization_id: actor.organization_id, name: subjectName })
        .select("id")
        .single();
      subjectId = newSub?.id;
    }

    // birebir ders + kayıt + program + oturumlar
    const { data: cls } = await admin
      .from("classes")
      .insert({
        branch_id: branchId,
        subject_id: subjectId,
        name: `${subjectName} (${name})`,
        type: "one_on_one",
        capacity: 1,
      })
      .select("id")
      .single();
    if (cls) {
      await admin.from("enrollments").insert({ class_id: cls.id, student_id: studentId });
      if (weekday && startTime) {
        const endTime = addHour(startTime);
        const { data: slot } = await admin
          .from("schedule_slots")
          .insert({ class_id: cls.id, weekday, start_time: startTime, end_time: endTime })
          .select("id")
          .single();
        if (slot) {
          const sess: {
            class_id: string;
            date: string;
            start_time: string;
            end_time: string;
            slot_id: string;
          }[] = [];
          const base = new Date(today + "T00:00:00");
          for (let i = 0; i < 28; i++) {
            const d = new Date(base);
            d.setDate(base.getDate() + i);
            if (((d.getDay() + 6) % 7) + 1 === weekday) {
              sess.push({
                class_id: cls.id,
                date: ymd(d),
                start_time: startTime,
                end_time: endTime,
                slot_id: slot.id,
              });
            }
          }
          if (sess.length > 0) {
            await admin.from("sessions").upsert(sess, {
              onConflict: "class_id,date,start_time",
              ignoreDuplicates: true,
            });
          }
        }
      }
    }

    await admin.from("subscriptions").upsert(
      {
        student_id: studentId,
        monthly_fee: monthlyFee,
        monthly_quota: monthlyQuota,
        total_months: 1,
        start_date: today,
        status: "active",
        opening_used: openingUsed,
        opening_period: openingUsed > 0 ? curPeriod : null,
        opening_balance: openingBalance,
      },
      { onConflict: "student_id" },
    );

    created++;
    results.push({ line, name, status: "ok", message: `Oluşturuldu · kullanıcı: ${username}` });
  }

  return { error: null, rows: results, created, mode };
}
