# Makbuz (Yazdırılabilir Tahsilat & Gider Belgesi) — Tasarım

**Tarih:** 2026-07-30
**Durum:** Onaylandı (uygulama planına hazır)

## Amaç

Kuruma gelir (öğrenci ödemesi) ve gider (maaş/harcama) kayıtları için **resmî olmayan**, yazdırılabilir bir makbuz/belge üretmek. Öncelik: veli bir ödeme yaptığında ona verilecek **tahsilat makbuzu**. İkincil ama aynı turda: **gider makbuzu**.

Bu belge yasal e-fatura/e-belge **değildir**; üzerinde bunu belirten bir ibare bulunur.

## Ek istek: "Ödemeyi alan" alanı

Ödeme alırken (PaymentForm) "Not"un yanına **"Ödemeyi alan"** metin kutusu eklenir; ödemeyi teslim alan kişinin adı yazılır ve makbuzda görünür. Giriş yapan yöneticinin adıyla ön-doldurulur (`viewer.full_name ?? viewer.username`).

Bu **tek DB değişikliği** gerektirir: `payments.received_by text` (nullable) → **migration 0017**. Migration DB'ye elle uygulanmalıdır (projede otomatik migration runner yok — bkz. 0016 olayı).

## Kapsam Dışı (YAGNI)

- Ardışık/sıralı makbuz numarası (kullanıcı istemedi — numara yok)
- Sunucu tarafı PDF üretimi (puppeteer/react-pdf) — tarayıcı yazdırması yeterli
- WhatsApp'tan gönderim (ileride ayrı iş)
- Yeni npm bağımlılığı — yok
- Migration: yalnızca 0017 (`received_by`); makbuzun kendisi yeni kolon istemez

## Çıktı Biçimi

Ayrı, sade bir **makbuz sayfası** (kendi route'u) tarayıcının `window.print()`'i ile yazdırılır. Aynı diyalogdan "PDF olarak kaydet" de mümkün. Sayfa yeni sekmede açılır.

## Mimari

### Route'lar

- `app/makbuz/tahsilat/[id]/page.tsx` — `[id]` = `payments.id`
- `app/makbuz/gider/[id]/page.tsx` — `[id]` = `expenses.id`

Her ikisi de ortak `<MakbuzBelgesi>` sunum bileşenini kullanır.

Bu sayfalar **PanelShell kullanmaz** (menü/sidebar yok). Root layout zaten sade (panel/nav içermiyor), dolayısıyla sayfa doğal olarak standalone beyaz bir belge olarak açılır.

### Bileşenler

- `components/makbuz/makbuz-belgesi.tsx` — sunum (server-safe, prop alır): başlık, gövde, imza alanı, footer ibaresi. Tahsilat ve gider için tek bileşen; `tur: "tahsilat" | "gider"` prop'u ve alanları parametreyle alır.
- `components/makbuz/yazdir-butonu.tsx` — client component; `onClick={() => window.print()}`. Ekranda görünür, `@media print` ile baskıda gizlenir.
- `lib/sayi-yaziya.ts` — `sayiyiYaziyaCevir(n: number): string`. Türkçe tam sayı → yazı ("1500" → "Binbeşyüz"). Makbuzda "… Türk Lirası" olarak gösterilir. Kuruş varsa "… Türk Lirası … Kuruş".

### Veri akışı

**Tahsilat makbuzu** (`/makbuz/tahsilat/[id]`):
1. `requireRole(["org_admin", "branch_admin"])`
2. `payments` → `id, amount, period_month, paid_at, note, student_id` (`.eq("id", id).maybeSingle()`)
   - Bulunamazsa → basit "Makbuz bulunamadı" ekranı (redirect değil, hata görünür olsun)
3. `profiles` → öğrenci `full_name, username, guardian_name`
4. `branch_memberships` (user_id = öğrenci) → ilk `branch_id` → `branches` (`name, address, phone`)
5. `organizations` → `name` (`.limit(1)`) — tek kurum varsayımı (mevcut kod deseni)
6. Bileşene aktarılan alanlar: kurum adı, şube adı/adres/telefon, öğrenci adı, veli adı, dönem (period_month → "Temmuz 2026 dönemi"), tutar (rakam + yazıyla), açıklama (note), tarih (paid_at)

**Gider makbuzu** (`/makbuz/gider/[id]`):
1. `requireRole(["org_admin", "branch_admin"])`
2. `expenses` → `id, category, amount, expense_date, note, teacher_id` (`.eq("id", id).maybeSingle()`)
3. Ödenen kişi (payee): `teacher_id` varsa `profiles.full_name`; yoksa kategori etiketi (`EXPENSE_CATEGORY_LABEL`)
4. Kurum adı `organizations`'tan; şube bilgisi giderde doğrudan yok → yalnızca kurum adı başlıkta yeterli (gider makbuzu kuruma ait bir ödeme belgesi)
5. Bileşene: kurum adı, ödenen kişi/kategori, tutar (rakam + yazıyla), açıklama, tarih (expense_date). "TAHSİLAT MAKBUZU" yerine **"GİDER / ÖDEME MAKBUZU"** başlığı.

### Makbuz içeriği (görsel yapı)

```
┌─────────────────────────────────────────┐
│  [Kurum Adı]                             │
│  [Şube Adı] · [Adres] · [Telefon]        │
│─────────────────────────────────────────│
│            TAHSİLAT MAKBUZU               │
│                          Tarih: 30.07.2026│
│                                          │
│  Sayın: [Veli adı]                       │
│  Öğrenci: [Öğrenci adı]                   │
│  Dönem: Temmuz 2026                       │
│  Açıklama: [note]                         │
│                                          │
│  Tutar:  1.500,00 ₺                       │
│  Yazıyla: Binbeşyüz Türk Lirası           │
│                                          │
│  Teslim eden           Teslim alan       │
│  ___________           ___________       │
│                                          │
│  Bu belge resmî fatura / e-belge değildir.│
└─────────────────────────────────────────┘
```

Gider makbuzunda: "Sayın/Öğrenci/Dönem" yerine "Ödenen: [kişi/kategori]" satırı, başlık "GİDER / ÖDEME MAKBUZU".

## Tetikleme noktaları (yazdır butonları)

1. **Tahsilat — öğrenci profili** ([app/kisi/[id]/page.tsx](../../../app/kisi/[id]/page.tsx)) → "Ödeme geçmişi" bölümü, her `payment` satırında **"Yazdır"** linki → `/makbuz/tahsilat/[payment.id]`, `target="_blank"`. (Not: "Bakiye güncellemesi" / adjustment satırlarında makbuz yok — yalnız gerçek ödemeler.)
2. **Gider — giderler sayfası** ([app/giderler/page.tsx](../../../app/giderler/page.tsx)) → "Son giderler" listesinde her satıra **"Yazdır"** linki → `/makbuz/gider/[expense.id]`, `target="_blank"`.
3. **Gider — öğretmen/personel profili** (aynı `app/kisi/[id]/page.tsx` içindeki "Ödeme geçmişi — verilen (maaş / hakediş)" bölümü) → her maaş satırına aynı "Yazdır" linki (aynı gider makbuzu route'u).

Linkler mevcut satır düzenini bozmadan, "Sil" butonunun yanına küçük bir metin linki olarak eklenir.

## Yetki & güvenlik

- Her iki makbuz route'u `requireRole(["org_admin", "branch_admin"])`.
- RLS şube izolasyonunu zaten uyguluyor; başka şubenin payment/expense id'si ile makbuz çekilemez (sorgu boş döner → "bulunamadı" ekranı).
- Öğrenci/öğretmen rolleri makbuz sayfasına erişemez (requireRole reddeder).

## Test / doğrulama

- Bir ödemenin makbuz sayfası açılıyor, doğru tutar + yazıyla karşılığı + kurum/şube başlığı görünüyor.
- `window.print()` diyaloğu açılıyor; print önizlemesinde "Yazdır" butonu ve varsa sayfa kromu görünmüyor (`@media print`).
- `sayiyiYaziyaCevir` birim testleri: 0, 1, 11, 100, 1000, 1500, 1.234.567, ondalık (1500,50) sınır durumları.
- Var olmayan / erişilemeyen id → "Makbuz bulunamadı" ekranı, çökme yok.
- Gider makbuzu: teacher_id'li (maaş) ve teacher_id'siz (genel gider) iki durumda payee doğru.

## Bağımlılıklar / risk

- Migration/paket yok → dağıtım riski minimum.
- Tek belirsizlik: `sayiyiYaziyaCevir` Türkçe kuralları (bir/bin ayrımı: "bir bin" değil "bin"). Birim testlerle kapatılır.
