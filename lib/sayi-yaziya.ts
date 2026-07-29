// Türkçe sayı → yazı dönüştürme (makbuzda "tutar yazıyla" için).
// Klasik çek/makbuz stili: gruplar bitişik yazılır (1500 → "binbeşyüz").

const BIRLER = [
  "",
  "bir",
  "iki",
  "üç",
  "dört",
  "beş",
  "altı",
  "yedi",
  "sekiz",
  "dokuz",
];
const ONLAR = [
  "",
  "on",
  "yirmi",
  "otuz",
  "kırk",
  "elli",
  "altmış",
  "yetmiş",
  "seksen",
  "doksan",
];

// 0..999 arası bir grubu yazıya çevirir.
function ucBasamak(n: number): string {
  let s = "";
  const yuz = Math.floor(n / 100);
  const on = Math.floor((n % 100) / 10);
  const bir = n % 10;
  if (yuz > 0) s += (yuz === 1 ? "" : BIRLER[yuz]) + "yüz"; // "yüz", "ikiyüz"...
  if (on > 0) s += ONLAR[on];
  if (bir > 0) s += BIRLER[bir];
  return s;
}

/**
 * Tam sayıyı Türkçe yazıya çevirir (0 – 999.999.999.999 aralığı yeterli).
 * Örn: 0 → "sıfır", 1000 → "bin", 1500 → "binbeşyüz".
 */
export function sayiyiYaziyaCevir(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return "sıfır";
  const gruplar: { value: number; suffix: string }[] = [
    { value: Math.floor(n / 1_000_000_000) % 1000, suffix: "milyar" },
    { value: Math.floor(n / 1_000_000) % 1000, suffix: "milyon" },
    { value: Math.floor(n / 1000) % 1000, suffix: "bin" },
    { value: n % 1000, suffix: "" },
  ];
  let s = "";
  for (const g of gruplar) {
    if (g.value === 0) continue;
    // "bir bin" değil "bin"
    if (g.suffix === "bin" && g.value === 1) s += "bin";
    else s += ucBasamak(g.value) + g.suffix;
  }
  return s;
}

/**
 * Para tutarını yazıyla verir. Örn: 1500.5 → "Binbeşyüz Türk Lirası Elli Kuruş".
 */
export function tutarYaziyla(amount: number): string {
  const abs = Math.abs(amount);
  const lira = Math.floor(abs);
  const kurus = Math.round((abs - lira) * 100);
  const cap = (str: string) =>
    str.charAt(0).toLocaleUpperCase("tr") + str.slice(1);
  let s = cap(sayiyiYaziyaCevir(lira)) + " Türk Lirası";
  if (kurus > 0) s += " " + cap(sayiyiYaziyaCevir(kurus)) + " Kuruş";
  return s;
}
