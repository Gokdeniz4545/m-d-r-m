// Roller ve giriş/rol yardımcıları (sunucu importu içermez, her yerde kullanılabilir).

export type UserRole =
  | "super_admin"
  | "org_admin"
  | "branch_admin"
  | "teacher"
  | "student"
  | "staff";

export type Profile = {
  id: string;
  organization_id: string | null;
  username: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
};

// Giriş yapmayan roller — kimlik/şifre otomatik üretilir, giriş bilgisi istenmez.
// (ŞİMDİLİK: öğrenci, öğretmen, personel sisteme girmiyor; sadece yöneticiler girer.)
export const NON_LOGIN_ROLES: readonly UserRole[] = ["student", "teacher", "staff"];

// Supabase Auth e-posta beklediği için kullanıcı adını sahte bir adrese eşleriz.
// Hiç e-posta gönderilmez; hesaplar sunucu tarafında otomatik onaylanır.
export const SYNTHETIC_EMAIL_DOMAIN = "okul-takip.app";

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

export const ROLE_HOME: Record<UserRole, string> = {
  super_admin: "/super",
  org_admin: "/kurum",
  branch_admin: "/sube",
  teacher: "/ogretmen",
  student: "/ogrenci",
  staff: "/personel",
};

export const ROLE_LABEL: Record<UserRole, string> = {
  super_admin: "Süper Yönetici",
  org_admin: "Kurum Yöneticisi",
  branch_admin: "Şube Yöneticisi",
  teacher: "Öğretmen",
  student: "Öğrenci",
  staff: "Personel",
};

export type NavItem = { href: string; label: string; icon?: string };

export const ROLE_NAV: Record<UserRole, NavItem[]> = {
  super_admin: [{ href: "/super", label: "Panel", icon: "panel" }],
  org_admin: [
    { href: "/kurum", label: "Panel", icon: "panel" },
    { href: "/ogrenci-ekle", label: "Öğrenci kaydı", icon: "ogrenciEkle" },
    { href: "/ogretmen-ekle", label: "Öğretmen ekle", icon: "ogretmenEkle" },
    { href: "/tahsilat", label: "Tahsilat", icon: "tahsilat" },
    { href: "/giderler", label: "Giderler", icon: "gider" },
    { href: "/gundem", label: "Gündem", icon: "gundem" },
  ],
  branch_admin: [
    { href: "/sube", label: "Panel", icon: "panel" },
    { href: "/ogrenci-ekle", label: "Öğrenci kaydı", icon: "ogrenciEkle" },
    { href: "/ogretmen-ekle", label: "Öğretmen ekle", icon: "ogretmenEkle" },
    { href: "/tahsilat", label: "Tahsilat", icon: "tahsilat" },
    { href: "/giderler", label: "Giderler", icon: "gider" },
    { href: "/gundem", label: "Gündem", icon: "gundem" },
  ],
  teacher: [
    { href: "/ogretmen", label: "Panel", icon: "panel" },
    { href: "/gundem", label: "Gündem", icon: "gundem" },
  ],
  student: [{ href: "/ogrenci", label: "Panel", icon: "panel" }],
  staff: [{ href: "/personel", label: "Panel", icon: "panel" }],
};

export type ClassType = "one_on_one" | "group";

export const CLASS_TYPE_LABEL: Record<ClassType, string> = {
  one_on_one: "Birebir",
  group: "Grup",
};

// index 0 → weekday 1 (Pazartesi)
export const WEEKDAYS = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
];

export function weekdayLabel(weekday: number): string {
  return WEEKDAYS[weekday - 1] ?? "?";
}

export type AttendanceStatus = "present" | "absent" | "excused" | "late";

export const ATTENDANCE_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: "present", label: "Geldi" },
  { value: "late", label: "Geç" },
  { value: "excused", label: "İzinli" },
  { value: "absent", label: "Gelmedi" },
];

export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  present: "Geldi",
  late: "Geç",
  excused: "İzinli",
  absent: "Gelmedi",
};
