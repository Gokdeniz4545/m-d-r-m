# Panel sadeleştirme + Raporlar ölçekleme + Profil üst kartı — Tasarım

**Tarih:** 2026-07-30 · **Durum:** Onaylandı, uygulandı

Kullanıcının 5 maddelik isteği. Kararlar (kullanıcı onayı): panelleri ikisi de sadeleştir; rapor ölçeği gün/hafta/ay; öğrenci grafiği yeni + birikimli; abonelik türü yeni alan.

## 1–3. Panel sadeleştirme + bugünün kayıtları
- **Şube paneli:** "Öğrencilerim" (aktif+pasif) kartı ve "Dersler" aksiyon kartı kaldırıldı.
- **Kurum paneli:** "Dersler" aksiyon kartı kaldırıldı. (Öğrenci kartı zaten yalnız "Aktif öğrenci".)
- **Bugünün yeni kayıtları → yalnız öğrenci:** `lib/dashboard-data.ts` `newToday` ve `app/kisiler` `tip=yeni` filtresi `role === "student"` ile sınırlandı. Aktif olmayan öğrenci hiçbir yerde öne çıkmıyor.

## 4. Raporlar — zaman ölçekli + kalem kalem
- `lib/report-buckets.ts`: `Scale = gun|hafta|ay`; `getBuckets` (gün=30, hafta=12 Pzt-başı, ay=12), `bucketKeyOf`, `bucketize`.
- `components/reports/scale-selector.tsx`: `?olcek=` ile gün/hafta/ay seçici (server Link).
- `app/raporlar/page.tsx` yeniden yazıldı: seçili ölçeğe göre Ciro, Gider, Net kâr, Yeni öğrenci ve **Toplam öğrenci (birikimli)** grafikleri; çok kovada yatay kaydırma (`ScrollChart`).
- **Kalem kalem** iki liste (pencere içi, son 100): Gelir (öğrenci · tarih · dönem · tutar) ve Gider (kategori · ödenen · tarih · not · tutar).
- Not: ciro artık `paid_at` (nakit esası) bazlı gruplanıyor — ölçekler arası tutarlılık için.

## 5. Öğrenci profili üst kartı + abonelik türü
- Üst karta öğrenci için özet: Dersler (+öğretmen), Ders gün/saati, Aylık aidat, Abonelik türü.
- Yeni alan `subscriptions.billing_period` (aylik/3_aylik/6_aylik/yillik) → **migration 0018**; `SubscriptionForm` seçim, `setSubscription` kayıt, `BILLING_PERIOD_LABEL` (lib/billing.ts). Aidat/abonelik yalnız yönetici görünümünde (sub çekiliyorsa).

## Migration (elle uygulanacak — bkz. mudurum-migration-elle-uygulama)
- `0018_subscription_billing_period.sql`: `subscriptions.billing_period text` (nullable).
- Profil sayfası sub select'i ve setSubscription bu kolonu kullanır → deploy'dan önce/eşzamanlı uygulanmalı.

## Kapsam dışı
- Öğrenci ayrılma tarihi (deactivated_at) — birikimli/yeni yaklaşımı seçildiği için gerekmedi.
- Rapor PDF/dışa aktarma.
