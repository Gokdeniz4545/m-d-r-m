# Tasarım: Öğretmen–Öğrenci Eşleştirme & Takip (ders/branş kavramı kaldırılıyor)

Tarih: 2026-08-03
Durum: Onaylandı (kullanıcı tasarımı onayladı)

## Bağlam (neden)

Uygulama şu an her öğrenci için ayrı bir `classes` (birebir ders) kaydı + `subjects`
(branş) + `enrollments` zinciri kuruyor. Kullanıcı bunu istemiyor: "ders/sınıf" kavramı
tamamen kalkacak. Yeni işleyiş: **öğretmenler var, her öğretmenin öğrencileri var,
her öğrencinin o öğretmenle belirli sayıda ders işleme hakkı var.** Uygulama artık
öğretmen ve öğrenciyi kurallar çerçevesinde **buluşturan (takvimde ders planlayan)** ve
**takip eden** (işlenen/kalan ders, telafi, borç) bir araç.

Bir kişi birden fazla öğretmenle ders alıyorsa **ayrı öğrenci profili** olarak kaydedilir
(içe aktarım zaten böyle yapıldı). Dolayısıyla **öğrenci → öğretmen tek yönlü, tekildir.**

Kapsam org: her iki organizasyon (Ulukent=Süleyman gerçek, kelsy=demo) aynı modele geçer.
Borç/tahsilat takibi aynen korunur (paket modu; bkz. mevcut `billing.ts`).

## Yeni veri modeli

- `profiles.teacher_id uuid null references profiles(id)` — öğrencinin **tek** öğretmeni.
  (Sadece `role='student'` için dolu; öğretmen/öğrenci bağı burada.)
- Ders hakkı takibi `subscriptions`'ta kalır (alan adları korunur, anlamları):
  - `monthly_quota` = **ders hakkı** (paket adedi)
  - `opening_used` = **işlenen ders**
  - `makeup_credits` = **telafi hakkı**
  - `opening_balance` = **borç** (paket modu aylık tahakkuku zaten kaldırdı)
- `sessions`: `class_id` yerine **`student_id` + `teacher_id`**. (`is_makeup`, `date`,
  `start_time`, `end_time`, `slot_id` korunur.)
- `schedule_slots`: `class_id` yerine **`student_id` + `teacher_id`** (haftalık tekrar deseni).
- Yeni tablo **`calendar_events`**: `id, organization_id, teacher_id, date, start_time,
  end_time, description text, created_by` — özel etkinlik (öğrenciyle ilgisiz).
- **Kaldırılır (model + UI):** `classes`, `subjects`, `enrollments`, `teacher_subjects`,
  `class_teachers`, `/dersler` sayfaları ve bileşenleri, branş yönetimi, menüdeki "Ders ekle".
  (Tablolar göç sonrası bırakılabilir/temizlenebilir; UI ve okuma yolları kaldırılır.)
- Yoklama durumları: **`present` (Geldi) / `absent` (Gelmedi) / `excused` (İzinli)**.
  `late` ("geç geldi") kaldırılır (UI'dan; DB check daraltılabilir).

## Muhasebe kuralları (uygulamanın "takip" kalbi)

- **Geldi (present)** → 1 ders hakkı düşer.
- **Gelmedi (absent, izinsiz)** → 1 ders hakkı düşer (hak yanar).
- **İzinli (excused)** → ders hakkı **düşmez**, **+1 telafi hakkı**, öğrenci **telafi havuzuna** girer.
- **Telafi dersi işlenince (present)** → 1 ders hakkı düşer **ve** 1 telafi hakkı eksilir.
- Telafi hakkı **ders işlenince** eksilir (planlanınca değil; plan iptal olabilir).

"İşlenen ders" hesabı: `opening_used` + `status != 'excused'` yoklamalar (paket modunda
kümülatif — mevcut `getStudentUsedThisMonth` paket dalı). Telafi (`is_makeup`) dersleri
de present işaretlenince işlenene sayılır.

> DİKKAT: Mevcut `markAttendance` "izinli"de telafiyi **azaltıyor** — bu **tersine**
> çevrilecek (excused → +1). Ayrıca telafi dersi present olunca -1 mantığı eklenecek.

## Öğrenci kaydı / düzenleme (yeni akış)

Branş/ders alanları kalkar. Yerine: **öğretmen seç** + **ders hakkı (adet)** +
**haftalık gün+saat** (opsiyonel). Kişisel/veli/TC/adres/doğum/borç alanları korunur.
Kayıtta haftalık gün+saat verilirse ilgili öğretmen takviminde slot açılır ve
önümüzdeki 4 hafta oturumları üretilir (mevcut `registerStudent` mantığının ders yerine
öğretmen+öğrenciye uyarlanmış hâli).

## Takvim

- Panelden iki takvim girişi:
  1. **Okul takvimi** — tüm dersler (mevcut `/takvim` davranışı, RLS kapsamı).
  2. **Öğretmen takvimi** — bir öğretmen seçilir, yalnız onun dersleri + özel etkinlikleri.
- Görünümler:
  - **Haftalık**: özet — dersler gün gün listelenir, 15 dk ızgara **yok**.
  - **Günlük**: **15 dk'lık slot ızgarası, 09:00–21:00** (48 slot). Her ders **45 dk = 3 slot** blok.
- Planlama öğretmen takviminin **günlük ızgarasında**: boş slot seçilir → öğrenci + saat
  ile ders planlanır. **Haftalık tekrar** (slot deseni) + **o haftaya özel / tek ders** istisnası:
  - Rutin değişiklik: slot düzenlenir → bundan sonraki oturumlar taşınır (`updateSlot` mantığı).
  - O haftaya özel: tek oturum taşınır/düzenlenir → desen bozulmaz.
- Özel etkinlik bloğu ilgili saatleri **kapatır** (o slotlara ders planlanamaz).

## Öğretmen değişikliği

- **Kalıcı:** öğrencinin `teacher_id`'si değişir; yaklaşan oturum/slotları yeni öğretmenin
  takvimine (mümkünse aynı gün/saatte) taşınır. Ders hakkı/telafi/borç öğrencide kalır.
- **Tek-derslik vekil:** yalnız o oturumun `teacher_id`'si değişir (o hafta), öğrencinin asıl
  öğretmeni değişmez.

## Telafi havuzu

- Yoklamada **İzinli** işaretlenince öğrenci havuza girer, `makeup_credits` +1.
- Panelde (kurum + şube) **"Telafi Havuzu" kartı**: telafi hakkı > 0 olan öğrenciler listelenir;
  her satırda öğrenci adı, **altında kalan telafi sayısı**, karşısında **"Telafi dersi planla"** butonu.
- Butona tıklayınca öğrencinin **öğretmeninin takvimi** (günlük 15 dk ızgara) açılır; boş bir slota
  telafi dersi (`is_makeup=true`) yerleştirilir (slot seçerek veya saat yazarak).
- Telafi dersi **present** işaretlenince: 1 ders hakkı düşer + 1 telafi eksilir.

## Özel etkinlik

- Alanlar: **öğretmen + tarih + başlangıç/bitiş saati + serbest açıklama**.
- Takvimde o saatleri **kapatır** (üstüne ders planlanamaz). **Tek seferlik.**

## Veri göçü

1. Her öğrenci için `profiles.teacher_id` = mevcut tek dersinin (`class.teacher_id`) öğretmeni.
   (İçe aktarımda her öğrenci tek class → tek teacher; 1:1 deterministik. Öğretmensiz derslerde null.)
2. `sessions` ve `schedule_slots`: her satırın `class_id`'sinden `student_id`
   (class'ın tek enrollment'ı) ve `teacher_id` (class.teacher_id) türetilip yazılır.
3. `subscriptions` zaten öğrenci bazında; dokunulmaz.
4. Göç doğrulandıktan sonra `classes/subjects/enrollments/teacher_subjects/class_teachers`
   kaldırılır (UI + okuma yolları; tablolar en son düşürülebilir).
5. Her iki org (Ulukent + kelsy) aynı göçten geçer.

## Uygulama aşamaları

1. **Veri modeli + göç + kaldırma:** yeni kolonlar/tablo (migration), göç scriptleri,
   `sessions/slots` öğrenci+öğretmene bağlanır, ders/branş UI ve okuma yolları kaldırılır,
   yoklama durumları (Geldi/Gelmedi/İzinli).
2. **Öğrenci kayıt/düzenleme yeni akış** (öğretmen seç + ders hakkı + haftalık saat).
3. **Takvim** (okul + öğretmen; haftalık özet + günlük 15 dk ızgara; tekrar + istisna planlama).
4. **Öğretmen değişikliği** (kalıcı + tek-derslik vekil).
5. **Telafi havuzu** (muhasebe düzeltmesi + panel kartı + planlama akışı).
6. **Özel etkinlikler** (calendar_events + takvimde gösterim/çakışma engeli).

Migration'lar Supabase panelinden **elle** çalıştırılır (otomatik geçmez). Kod değişiklikleri
Vercel'e **deploy** gerektirir (git push).

## Kapsam dışı (YAGNI)

- Branş/enstrüman kavramı geri gelmez.
- Çoklu öğretmen-tek profil bağı yok (çoklu ders = çoklu profil).
- Grup dersi yok (her ders birebir: 1 öğrenci + 1 öğretmen).
- Aylık abonelik tahakkuku yok (paket modu korunur).
