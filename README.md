# SCMA 251 · Linear Algebra Practice

เว็บแบบฝึกหัดท้าย section สำหรับวิชา Linear Algebra ต่อยอดจาก `scim105-practice`
(static HTML บน GitHub Pages + Supabase เก็บบัญชี/คะแนน + Pyodide รัน Python ในเบราว์เซอร์)
เพิ่มชนิดโจทย์ที่ไม่ใช่โค้ด 5 แบบ และ KaTeX สำหรับสูตรคณิตศาสตร์

| ชนิด (`type`) | นักศึกษาทำอะไร | ใช้กับ |
|---|---|---|
| `cloze` | เติมช่องว่างในนิยาม/ทฤษฎี จากเมนูตัวเลือก | ทบทวนนิยาม |
| `spot` | คลิกบรรทัดที่ผิดในการพิสูจน์ แล้วเลือกเหตุผล | อ่านพิสูจน์ |
| `mcq` | เลือกตอบ (ข้อเดียว/หลายข้อ) | ตัดสินตัวอย่าง |
| `order` | **Proof Blocks** — เรียงข้อความให้เป็นการพิสูจน์ มีตัวหลอกให้ทิ้ง ตรวจแบบ DAG (ลำดับที่สลับกันได้ก็ผ่าน) | พิสูจน์ทฤษฎี |
| `axioms` | ตัดสินทีละสัจพจน์ ผ่าน/ไม่ผ่าน ข้อที่ไม่ผ่านต้องพิมพ์ counterexample เป็นตัวเลข เว็บคำนวณด้วย numpy ว่าละเมิดจริง | ตรวจ vector space / subspace |
| `code` | เขียน Python (numpy/scipy/sympy) รันเทสในเบราว์เซอร์ — เพิ่ม `tol`, `sort`, `check` สำหรับคำตอบที่ไม่ unique | คำนวณ |

โจทย์แบ่งเป็น **section ตามชีท** (2.1, 2.2, …) แต่ละ section มี 4 level:
1 ทบทวนนิยาม → 2 เรียงการพิสูจน์ → 3 ตรวจสอบด้วยทฤษฎี → 4 คำนวณด้วย Python
(ต้องทำ level ก่อนหน้าให้ครบก่อน — ปิดได้ที่ `LOCK_LEVELS` ใน `assets/config.js`)

## ไฟล์

```
index.html            หน้าแรก: การ์ด section จัดกลุ่มตามบท
section.html          หน้าทำโจทย์ (?s=21 คือ section 2.1)
admin.html            จัดการ section / โจทย์ / import bank / ดูความคืบหน้า / class list
assets/config.js      *** ไฟล์เดียวที่ต้องแก้: URL + anon key ของ Supabase ***
assets/app.js         auth, helper, KaTeX
assets/quiz.js        widget + ตัวตรวจของโจทย์ 5 ชนิดที่ไม่ใช่โค้ด
assets/styles.css
assets/problem_bank.json   คลังโจทย์ (สร้างจาก bank/*.py) — เอาไป import ในหน้า Admin
sql/01_schema.sql     ตาราง + RLS   (รันครั้งเดียว)
sql/02_seed_sections.sql   การ์ด section ทั้ง 18 อัน (ปิดอยู่ทั้งหมด)
sql/03_make_me_admin.sql   ตั้งตัวเองเป็น admin
sql/99_undo_in_scim105_project.sql  เก็บกวาด ถ้าเผลอรัน 01 ในโปรเจกต์ scim105
SETUP.md              คู่มือติดตั้งทีละคลิก
bank/s21.py, s22.py   ต้นฉบับโจทย์แต่ละ section (Python เพื่อให้เขียน LaTeX ง่าย) + เฉลยอ้างอิง
bank/solutions.json   เฉลยอ้างอิง (สร้างอัตโนมัติ) — อย่าอัปโหลดขึ้นเว็บ
tools/build_bank.py   bank/*.py  ->  assets/problem_bank.json + bank/solutions.json
tools/validate_bank.py ตรวจโจทย์ทุกข้อ: รันเฉลยผ่าน harness เดียวกับเบราว์เซอร์, ตรวจ DAG, ตรวจ counterexample
tools/test/           ทดสอบเว็บจริงใน Chromium (ต้องมี playwright)
```

## ติดตั้งครั้งแรก

ขั้นตอนละเอียดทีละคลิกอยู่ใน **[SETUP.md](SETUP.md)** — ย่อ ๆ คือ

1. **Supabase** สร้างโปรเจกต์ใหม่ *แยกจากของ SCIM 105* (ชื่อตารางชนกัน) — Free ให้ 2 โปรเจกต์ต่อ 1 organization
2. SQL Editor → รัน `sql/01_schema.sql` แล้ว `sql/02_seed_sections.sql`
3. Settings → Data API → copy **Project URL** · Settings → API Keys → copy **Publishable key** → ใส่ `assets/config.js`
4. Authentication → Providers → Google: ใส่ Client ID/Secret ชุดเดียวกับ scim105 แล้วเอา *Callback URL* ไปเพิ่มใน Google Cloud Console
5. Authentication → URL Configuration: Site URL + Redirect URLs = URL ของ GitHub Pages
6. push ขึ้น repo ใหม่ (ยกเว้นโฟลเดอร์ `bank/` ที่มีเฉลย) → Settings → Pages → branch `main` / root
7. เข้าเว็บ sign in 1 ครั้ง → รัน `sql/03_make_me_admin.sql` → reload จะเห็นปุ่ม **Admin**
8. Admin → **3 · Import bank** → เลือก `assets/problem_bank.json` → check → import
9. Admin → **6 · Class list** → อัปโหลด `ListSubjectRegis25691-.xls` ใส่เทอม `2569/1`

> โปรเจกต์แผน Free จะถูก pause ถ้าไม่มีใครใช้ 1 สัปดาห์ — ช่วงปิดเทอมถ้าเข้าไม่ได้ ให้กด **Restore project** ใน dashboard (ข้อมูลไม่หาย)

## ใช้งานแต่ละสัปดาห์

- สอนจบ section ไหน → Admin → **1 · Sections** → ติ๊ก **Open** แถวนั้น → Save
  นักศึกษาเห็นการ์ดเปิดทันที (การ์ดจะคลิกได้ต่อเมื่อ Open **และ** มีโจทย์)
- ดูคะแนน: **5 · Student progress** (มี heat map ต่อข้อ, export CSV)

## เขียน/แก้โจทย์

แก้ใน `bank/sNN.py` (ดูตัวอย่างใน `s21.py`, `s22.py`) แล้ว

```bash
python tools/build_bank.py       # สร้าง assets/problem_bank.json
python tools/validate_bank.py    # ต้องขึ้น "OK - no errors"
```

จากนั้น import ใหม่ในหน้า Admin (โจทย์เดิมถูกอัปเดตตาม slug ไม่ซ้ำ ไม่ลบ)
รูปแบบ `spec` ของแต่ละ type อยู่หัวไฟล์ `assets/quiz.js`; ข้อความทุกช่องเป็น HTML ใส่สูตรระหว่าง `$…$` ได้

หลักการออกแบบที่ใช้อยู่
- **order**: ระบุ `deps` เป็นคู่ `[ก่อน, หลัง]` เฉพาะที่จำเป็นจริง ๆ ลำดับที่สลับกันได้ (เช่น ตรวจปิดบวก/ปิดคูณ) จะผ่านทั้งสองแบบ; ใส่ `distractors` 1–2 ข้อพร้อม `why`
  (นักศึกษาเห็นหลังทำถูก); feedback บอกแค่จำนวนที่ผิด จนกว่าจะพลาดครบ `ORDER_HINT_AFTER` ครั้ง จึงชี้กรอบแดง/เหลือง
- **axioms**: `setup` ต้องนิยาม `add(u,v)`, `smul(a,u)`, `in_set(u)`, `ZERO` (และ `neg(u)` ถ้ามี VS6);
  `check` คือ expression ที่เป็น True เมื่อสัจพจน์เป็นจริงกับค่าที่นักศึกษาให้; ตัวแปรใน `scalars` ไม่ถูกตรวจ `in_set`
  ก่อนเปิดหินต์ นักศึกษาเห็นแค่ "ตัดสินถูก k จาก n ข้อ" เพื่อกันการกดสลับไปเรื่อย ๆ
- **code**: ถ้าเทสต้องส่งฟังก์ชันเป็น argument ให้ใช้รูป `expr`; คำตอบที่ไม่ unique (eigenvector, basis) ใช้
  `"check": "np.allclose(A @ got, lam * got)"` แทน `expected`; eigenvalue ใช้ `"sort": true`

> คำตอบของ cloze/mcq/order อยู่ใน `spec` ซึ่งนักศึกษาที่รู้วิธีเปิด DevTools อ่านได้ (เหมือน test cases ของ SCIM 105)
> ถือเป็นแบบฝึกหัด ไม่ใช่ข้อสอบ

## ทดสอบเว็บทั้งระบบในเครื่อง (ไม่บังคับ)

`tools/test/ui_test.mjs` เปิด Chromium headless แทน supabase-js ด้วย mock แล้วทำโจทย์ทุกข้อด้วยเฉลย
ต้องมี `playwright` และโฟลเดอร์ vendor ที่มี `node_modules/{katex,codemirror}` กับ Pyodide 0.26.4 แตกไว้ (ดูหัวไฟล์)

```bash
VENDOR=/path/to/vendor node tools/test/ui_test.mjs --shots shots/
```

## สถานะเนื้อหา

| section | สถานะ |
|---|---|
| 2.1 Vector space | 12 ข้อ ✓ |
| 2.2 Subspace | 15 ข้อ ✓ |
| 2.3 – 2.8, บท 3, บท 4 | การ์ดสร้างไว้แล้ว (ปิด) รอเขียนโจทย์ |
