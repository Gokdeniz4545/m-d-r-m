# Müdürüm — Öğrenci & Öğretmen Aktarım Tablosu (Doldurma Rehberi)

İki tablo var. **Önce öğretmenleri**, sonra öğrencileri doldurun (öğrenci tablosunda
her öğrenciyi bir öğretmene bağlıyoruz, o yüzden öğretmenler önce girilmeli).

- Google Sheets veya Excel ile açabilirsiniz. Her satır bir kişidir.
- **İlk satır (başlıklar) değiştirilmesin.** Örnek satırları doldurmadan önce silin.
- Boş bırakılabilir alanlar aşağıda belirtildi; **Ad Soyad her zaman zorunlu.**
- Aynı **branş** ve **şube** adını iki tabloda da aynı yazın (örn. hep "Piyano", hep "Merkez").

---

## 1) ÖĞRETMENLER  (`1-OGRETMENLER.csv`)

| Sütun | Zorunlu? | Açıklama / Örnek |
|---|---|---|
| **Ad Soyad** | ✅ | Ahmet Yılmaz |
| Telefon | – | WhatsApp numarası. 05321112233 |
| Branşlar | – | Verebildiği dersler, **virgülle**: `Piyano, Gitar` |
| Maaş Tipi | – | `Aylık` veya `Ders Başı` |
| Ücret | – | Sadece sayı. Ders başıysa ders ücreti, aylıksa aylık maaş. Örn: 250 |
| Şube | – | Şube adı. Tek şube varsa boş bırakılabilir |

## 2) ÖĞRENCİLER  (`2-OGRENCILER.csv`)

| Sütun | Zorunlu? | Açıklama / Örnek |
|---|---|---|
| **Ad Soyad** | ✅ | Ayşe Kaya |
| Öğrenci Telefonu | – | 05xx… (öğrencinin kendi numarası, varsa) |
| Veli Adı | – | Fatma Kaya |
| Veli Telefonu | – | WhatsApp hatırlatmaları buraya gider. 05341234567 |
| Şube | – | Merkez (tek şube varsa boş bırakılabilir) |
| Branş | – | Piyano |
| Öğretmen | – | Dersini veren öğretmenin adı — **öğretmen tablosundaki adla birebir aynı** |
| Aylık Ücret | – | Sadece sayı. Örn: 2000 |
| Aylık Ders Sayısı | – | Ayda kaç ders. Örn: 4 |
| Ders Günü | – | `Pazartesi`…`Pazar` veya 1–7 |
| Ders Saati | – | `18:00` |
| Kayıt Tarihi | – | `YYYY-AA-GG` → 2026-02-01. Boşsa bugünden başlar |
| Devir Borç | – | Sisteme geçerken **devreden borç** (₺). Yoksa boş |
| Devir İşlenen Ders | – | Bu ay **zaten yapılmış** ders sayısı. Örn: 4 derslik pakette 3 dersi geldiyse `3` |

---

**"Devir" sütunları neden var?** Kurum sisteme ay ortasında geçiyorsa: öğrencinin
o ana kadarki borcunu (**Devir Borç**) ve bu ay çoktan işlenmiş derslerini
(**Devir İşlenen Ders**) yazarsanız, bakiye ve kalan ders hakkı doğru başlar.

Doldurup bana geri gönderin; öğrenci ve öğretmenleri sisteme ben aktarırım.
