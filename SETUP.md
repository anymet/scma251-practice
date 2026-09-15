# ติดตั้ง SCMA 251 Practice ทีละขั้น

เอกสารนี้ขยายจากหัวข้อ "ติดตั้งครั้งแรก" ใน `README.md` — ทำตามลำดับ 1→9 ครั้งเดียวจบ
รวมเวลาประมาณ 20–30 นาที (ส่วนใหญ่คือรอ Supabase สร้างฐานข้อมูล)

---

## 1. สร้างโปรเจกต์ Supabase ใหม่

> **ทำไมต้องใหม่** วิชานี้ใช้ชื่อตาราง `weeks` / `problems` / `attempts` เหมือน SCIM 105
> ถ้าใช้โปรเจกต์เดียวกัน การ์ด section ของ Linear Algebra จะไปโผล่ในเว็บ Python
> และคะแนนของสองวิชาจะถูกบวกรวมกัน

1. เปิด <https://supabase.com/dashboard> แล้วเข้าสู่ระบบด้วยบัญชีเดียวกับที่ใช้ทำ SCIM 105
2. มุมซ้ายบนเลือก **organization** ที่มีโปรเจกต์ scim105 อยู่
   *แผน Free ให้ "2 active projects ต่อ 1 organization"* — ถ้ามี scim105 อยู่แล้ว 1 อัน ยังสร้างได้อีก 1 อันพอดี
   (ถ้าเต็ม กดที่ชื่อ organization → **New organization** สร้างองค์กรใหม่ แล้วสร้างโปรเจกต์ในนั้นแทน)
3. กดปุ่ม **New project** แล้วกรอก

   | ช่อง | ใส่ว่า |
   |---|---|
   | Project name | `scma251-practice` |
   | Database Password | กด **Generate a password** แล้ว **copy เก็บไว้** (เว็บนี้ไม่ได้ใช้ แต่ Supabase ไม่แสดงซ้ำ) |
   | Region | **Southeast Asia (Singapore)** — ใกล้ไทยที่สุด |
   | Plan | Free |

4. กด **Create new project** แล้วรอประมาณ 2 นาที จนสถานะเปลี่ยนจาก *Setting up* เป็นพร้อมใช้

> ⚠️ โปรเจกต์แผน Free จะถูก **pause อัตโนมัติถ้าไม่มีการใช้งาน 1 สัปดาห์**
> ระหว่างเปิดเทอมไม่เป็นปัญหา (นักศึกษาเข้าทุกสัปดาห์) แต่ช่วงปิดเทอมถ้าเว็บล็อกอินไม่ได้
> ให้เข้า dashboard แล้วกด **Restore project** รอสักครู่ก็กลับมาเหมือนเดิม ข้อมูลไม่หาย

---

## 2. สร้างตาราง

1. เมนูซ้าย **SQL Editor** → **New query**
2. เปิดไฟล์ `sql/01_schema.sql` ในเครื่อง copy ทั้งไฟล์มาวาง → กด **Run** (หรือ Ctrl+Enter)
   ต้องขึ้น *Success. No rows returned*
3. **New query** อีกครั้ง วาง `sql/02_seed_sections.sql` → **Run**
   คราวนี้จะได้การ์ด section 18 อัน (ปิดอยู่ทั้งหมด)

> ถ้าเจอ `ERROR: column "label" of relation "weeks" does not exist` แปลว่ากำลังรันผิดโปรเจกต์
> (ไปรันในโปรเจกต์ที่มีตาราง `weeks` ของ SCIM 105 อยู่แล้ว) — หยุดก่อน แล้วกลับไปข้อ 1

---

## 3. เอา URL กับ key มาใส่ `assets/config.js`

1. เมนูซ้ายล่าง **Settings** (รูปเฟือง) → **Data API** → copy **Project URL**
   หน้าตาแบบ `https://abcdefghijk.supabase.co`
2. **Settings** → **API Keys** → copy **Publishable key** (ขึ้นต้นด้วย `sb_publishable_…`)
   โปรเจกต์เก่าบางอันจะเห็นเป็น **anon public** แบบ JWT ยาว ๆ แทน — ใช้ได้เหมือนกัน
   **ห้ามเอา secret / service_role key มาใส่เด็ดขาด** (ตัวนั้นข้ามกฎความปลอดภัยทั้งหมด)
3. เปิด `assets/config.js` วางทั้งสองค่าลงบรรทัด `SUPABASE_URL` และ `SUPABASE_ANON_KEY` แล้วบันทึก

---

## 4. เปิดการล็อกอินด้วย Google

1. **Authentication** → **Sign In / Providers** → **Google** → เปิดสวิตช์ **Enable Sign in with Google**
2. ช่อง **Client ID** และ **Client Secret** ใส่ **ชุดเดียวกับที่ scim105 ใช้อยู่**
   (ดูได้จาก Supabase โปรเจกต์ scim105 → Authentication → Providers → Google)
3. ในหน้าเดียวกัน Supabase แสดง **Callback URL (for OAuth)** หน้าตา
   `https://abcdefghijk.supabase.co/auth/v1/callback` — **copy ไว้**
4. เปิด <https://console.cloud.google.com/apis/credentials> → เลือก OAuth client ตัวที่ scim105 ใช้
   → หัวข้อ **Authorized redirect URIs** กด **ADD URI** วาง callback URL จากข้อ 3 → **SAVE**
   *(ของ scim105 ยังอยู่ในลิสต์ ไม่ต้องลบ — หนึ่ง client ใส่ได้หลาย URI)*
5. กลับมาที่ Supabase กด **Save** ในหน้า Google provider

---

## 5. ตั้ง URL ของเว็บ

**Authentication** → **URL Configuration**

| ช่อง | ใส่ว่า |
|---|---|
| Site URL | `https://anymet.github.io/scma251-practice/` |
| Redirect URLs | เพิ่ม `https://anymet.github.io/scma251-practice/index.html` |

(ยังไม่มี URL จริงก็ข้ามไปทำข้อ 6 ก่อน แล้วค่อยกลับมากรอก)

---

## 6. ขึ้น GitHub Pages

repo ที่สร้างไว้แล้วคือ <https://github.com/anymet/scma251-practice>
(ยังว่าง GitHub เลยแสดงหน้า **Quick setup** — หน้านั้นจะหายไปเองทันทีที่มีไฟล์)

1. ในหน้า Quick setup กดลิงก์ **uploading an existing file**
   (ถ้าหน้านั้นหายไปแล้ว ใช้ปุ่ม **Add file → Upload files** แทน)
2. เปิดโฟลเดอร์ `C:\00_scma\scma251\00_quiz_system\upload_to_github`
   แล้วลาก **ทุกอย่างที่อยู่ข้างใน** (ไม่ใช่ตัวโฟลเดอร์) ไปวางในหน้าเว็บ
   เบราว์เซอร์จะอัปโหลดทั้งโฟลเดอร์ย่อยให้เอง
   > โฟลเดอร์นี้เตรียมไว้ให้แล้ว = ทุกไฟล์ **ยกเว้น `bank/`** ซึ่งมีเฉลย
   > (การอัปโหลดผ่านหน้าเว็บ GitHub ไม่สนใจ `.gitignore` จึงต้องกันด้วยการไม่ลากขึ้นไป)
3. เลื่อนลงล่างสุด กด **Commit changes**
4. **Settings** → **Pages** → Source = *Deploy from a branch* → Branch `main` / `/ (root)` → **Save**
5. รอ 1–2 นาที แล้วเปิด **<https://anymet.github.io/scma251-practice/>** — ควรเห็นหน้า Sign in

> ถ้าตอนอัปโหลดยังไม่ได้ใส่ค่าใน `assets/config.js` แก้บน GitHub ได้เลย:
> กดเข้าไฟล์ `assets/config.js` → ปุ่มดินสอ (Edit) → วาง Project URL กับ Publishable key → Commit
>
> ในโฟลเดอร์มี `.github/workflows/keep-supabase-awake.yml` ติดมาด้วย (ชุดเดียวกับที่ scim105 ใช้)
> มันยิง read เบา ๆ วันละครั้งกัน Supabase หลับตอนปิดเทอม ไม่ต้องตั้งค่าอะไรเพิ่ม

## 7. ตั้งตัวเองเป็น admin

1. เข้าเว็บ กด **Sign in with Google** ด้วยบัญชีมหิดลของตัวเอง 1 ครั้ง (เพื่อให้มีแถวใน `profiles`)
2. กลับไป Supabase → **SQL Editor** → วาง `sql/03_make_me_admin.sql` → **Run**
3. reload เว็บ จะเห็นปุ่ม **Admin** บนแถบด้านบน

---

## 8. นำเข้าคลังโจทย์

**Admin** → แท็บ **3 · Import bank** → ช่อง *…หรือเลือกไฟล์* เลือก `assets/problem_bank.json`
→ กด **Step 1 — check it** (ต้องขึ้นกรอบเขียวบอกจำนวนข้อ) → **Step 2 — import**

---

## 9. อัปโหลดรายชื่อนักศึกษา

**Admin** → แท็บ **6 · Class list** → ช่อง Term ใส่ `2569/1` → เลือกไฟล์ `ListSubjectRegis25691-.xls`
จากระบบทะเบียน → ตรวจตัวอย่างที่ขึ้นมา → **Add these students to the term**

---

## เสร็จแล้ว — ใช้งานประจำสัปดาห์

สอนจบ section ไหน → **Admin** → แท็บ **1 · Sections** → ติ๊ก **Open** แถวนั้น → **Save**
นักศึกษาจะเห็นการ์ดนั้นเปิดทันที (การ์ดคลิกได้ต่อเมื่อ Open **และ** มีโจทย์อยู่ใน section นั้น)

ดูความคืบหน้า: แท็บ **5 · Student progress** — มีตารางรายคน, heat map รายข้อ และปุ่ม export CSV
