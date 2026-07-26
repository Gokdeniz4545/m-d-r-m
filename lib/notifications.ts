import { formatTRY } from "@/lib/billing";

// Bildirim mesaj şablonları (WhatsApp/SMS/e-posta için düz metin).
// Yalnız server tarafında kullanılır.

export function paymentReminderMessage(o: {
  studentName: string;
  guardianName?: string | null;
  amount: number;
  unpaidMonths: number;
  orgName?: string | null;
}): string {
  const hitap = o.guardianName ? `Sayın ${o.guardianName}` : "Merhaba";
  const ay = o.unpaidMonths > 0 ? `${o.unpaidMonths} aylık ` : "";
  const imza = o.orgName ? `\n\n${o.orgName}` : "";
  return (
    `${hitap},\n` +
    `${o.studentName} için ${ay}ödeme bakiyesi ${formatTRY(o.amount)}'dir. ` +
    `Ödemenizi en kısa sürede yapmanızı rica ederiz.` +
    imza
  );
}

export function lessonReminderMessage(o: {
  studentName: string;
  guardianName?: string | null;
  dateLabel: string;
  time: string;
  orgName?: string | null;
}): string {
  const hitap = o.guardianName ? `Sayın ${o.guardianName}` : "Merhaba";
  const imza = o.orgName ? `\n\n${o.orgName}` : "";
  return (
    `${hitap},\n` +
    `${o.studentName} için ${o.dateLabel} günü saat ${o.time} dersini hatırlatırız.` +
    imza
  );
}
