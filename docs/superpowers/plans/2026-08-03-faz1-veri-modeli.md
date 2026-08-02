# Faz 1 — Öğretmen–Öğrenci Veri Modeli & Göç (eklemeli, bozmayan)

> **Ajan işçiler için:** Bu planı `superpowers:executing-plans` ile task-task uygulayın. Adımlar checkbox (`- [ ]`).

**Amaç:** "Ders/sınıf" modelinden öğrenci→öğretmen modeline geçişin **temelini** kur —
yeni kolonlar/tablo ekle ve mevcut veriyi (öğretmen bağı, sessions/slots) göç ettir. Bu faz
**eklemelidir**: hiçbir şey silinmez, mevcut UI çalışmaya devam eder.

**Mimari:** `profiles.teacher_id` ile öğrenci→öğretmen (tekil). `sessions`/`schedule_slots`'a
`student_id`+`teacher_id` eklenir ve mevcut `classes`/`enrollments`'tan doldurulur. `calendar_events`
tablosu (özel etkinlik) eklenir. Sonraki fazlar okuma yollarını ve UI'ı bu kolonlara taşıyıp
ders/branş'ı kaldıracak.

**Tech:** Next 16, Supabase (Postgres + RLS), service-role admin client (göç scriptleri).

## Global Constraints (spec'ten)
- Migration'lar Supabase panelinden **elle** çalıştırılır (otomatik geçmez — 2x kırdı geçmişte).
- Kod değişiklikleri canlıya **deploy** ile gider (git push → Vercel), veri işlemleri doğrudan DB.
- Öğrenci → öğretmen **tekil** (1 öğrenci = 1 öğretmen; çoklu ders = çoklu profil).
- Her iki org (Ulukent `2b1cdf2d…`, kelsy `9ce9d372…`) aynı göçten geçer.
- Test framework yok → doğrulama: node scriptleri + `node node_modules/typescript/bin/tsc --noEmit`.

---

### Task 1: Migration dosyası (eklemeli şema)

**Files:**
- Create: `supabase/migrations/0021_teacher_student_model.sql`

**Produces:** `profiles.teacher_id`, `sessions.student_id/teacher_id`,
`schedule_slots.student_id/teacher_id`, tablo `calendar_events` (+RLS).

- [ ] **Step 1: Migration'ı yaz**

```sql
-- Müdürüm — Öğretmen-öğrenci modeli (Faz 1, eklemeli)
-- Öğrenci → öğretmen (tekil)
alter table public.profiles
  add column if not exists teacher_id uuid references public.profiles(id) on delete set null;
create index if not exists idx_profiles_teacher on public.profiles(teacher_id);

-- Oturum ve haftalık slot: ders yerine öğrenci+öğretmen
alter table public.sessions
  add column if not exists student_id uuid references public.profiles(id) on delete cascade;
alter table public.sessions
  add column if not exists teacher_id uuid references public.profiles(id) on delete set null;
alter table public.schedule_slots
  add column if not exists student_id uuid references public.profiles(id) on delete cascade;
alter table public.schedule_slots
  add column if not exists teacher_id uuid references public.profiles(id) on delete set null;
create index if not exists idx_sessions_student on public.sessions(student_id);
create index if not exists idx_slots_student on public.schedule_slots(student_id);

-- Özel etkinlikler (öğrenciyle ilgisiz; öğretmen takvimini kapatır)
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_calendar_events_teacher_date
  on public.calendar_events(teacher_id, date);
alter table public.calendar_events enable row level security;
drop policy if exists tenant on public.calendar_events;
create policy tenant on public.calendar_events for all to authenticated
  using (public.is_super() or organization_id = public.my_org())
  with check (public.is_super() or organization_id = public.my_org());
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/0021_teacher_student_model.sql
git commit -m "Faz1: öğretmen-öğrenci modeli migration (eklemeli)"
```

- [ ] **Step 3: Kullanıcıya migration'ı çalıştırt** — Supabase SQL Editor'da 0021'i çalıştır,
"tamam" onayı bekle. (Göç scripti sütunlar olmadan çalışamaz.)

---

### Task 2: Göç scripti — teacher_id / student_id doldur

**Files:**
- Create (geçici, commit yok): `_migrate_faz1.mjs`

**Consumes:** Task 1'in kolonları. **Produces:** dolu `profiles.teacher_id`,
`sessions.student_id/teacher_id`, `schedule_slots.student_id/teacher_id`.

- [ ] **Step 1: Scripti yaz** — mantık:
  1. `classes` (id, teacher_id) + `enrollments` (class_id, student_id) çek → `classId → {teacherId, studentId}` haritası (birebir: her class'ın tek enrollment'ı).
  2. `profiles.teacher_id`: her enrollment için `student.teacher_id = class.teacher_id` (yalnız null olanları güncelle; batch'li).
  3. `sessions`: her satır için `class_id`'den `student_id` + `teacher_id` yaz (student_id null olanlar).
  4. `schedule_slots`: aynı şekilde.
  Service-role admin client (RLS bypass), `.env.local`'dan anahtar; 100'lük batch'ler.

- [ ] **Step 2: Çalıştır**

```bash
node _migrate_faz1.mjs
```

Beklenen: hata yok; güncellenen profil/sessions/slot sayıları raporlanır.

---

### Task 3: Göç doğrulama

**Files:** Create (geçici): `_verify_faz1.mjs`

- [ ] **Step 1: Doğrulama scriptini yaz + çalıştır** — kontroller:
  - Enrollment'ı olan öğrenci sayısı == `teacher_id` dolu öğrenci sayısı (org bazında).
  - `sessions` toplam == `student_id` dolu sessions (class_id'si olan tüm satırlar için).
  - `schedule_slots` toplam == `student_id` dolu slot.
  - Spot: 3 öğrenci (ör. EFE GÜLÜMSER, ONUR ÖZSAN) → `profiles.teacher_id` doğru öğretmen mi.
  - kelsy örnek 1 öğrenci → teacher_id dolu mu.

Beklenen: tüm eşitlikler tutar; spot-check doğru.

- [ ] **Step 2: Geçici scriptleri sil**

```bash
rm -f _migrate_faz1.mjs _verify_faz1.mjs
```

---

### Task 4: Tip kontrolü (regresyon yok)

- [ ] **Step 1: tsc** — `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`
  Beklenen: hata yok (bu faz kod okuma yollarını değiştirmedi; sadece şema+veri).

---

## Self-Review (spec kapsamı)
- Spec "Veri modeli" → Task 1 (kolonlar/tablo) + Task 2 (göç). ✓
- Spec "Veri göçü" 1–3 → Task 2. ✓ (Adım 4–5 "kaldırma" sonraki fazda.)
- `calendar_events` (özel etkinlik altyapısı) → Task 1. ✓ (Kullanımı Faz 6.)
- Yoklama durumları / ders-branş kaldırma / takvim → **sonraki fazların planı** (Faz 2–6).
- Bu faz eklemeli: mevcut UI (`/dersler`, takvim, kişi) class_id ile çalışmaya devam eder. ✓
