-- =====================================================================
--  ใช้เฉพาะกรณีที่เผลอรัน 01_schema.sql ของ SCMA 251 ไปในโปรเจกต์ Supabase
--  ของ SCIM 105  —  รันไฟล์นี้ใน "โปรเจกต์ SCIM 105" เพื่อเก็บกวาดของที่งอกมา
--
--  ของเดิมของ SCIM 105 ไม่ถูกแตะเลย (ตาราง ข้อมูล policy ชื่อเดิม ยังอยู่ครบ)
--  สิ่งที่ไฟล์นี้ลบคือ policy ชุดใหม่ที่ชื่อไม่ซ้ำกับของเดิม จึงไปซ้อนทับกันอยู่
--  สิทธิ์รวมของทั้งสองชุดเท่ากันเป๊ะ ไม่ลบก็ไม่มีอะไรเสีย แค่รกในหน้า Policies
-- =====================================================================

drop policy if exists "profiles self read"   on public.profiles;
drop policy if exists "profiles self write"  on public.profiles;
drop policy if exists "profiles self update" on public.profiles;

drop policy if exists "logins self insert"   on public.logins;
drop policy if exists "logins admin read"    on public.logins;

drop policy if exists "weeks read"           on public.weeks;
drop policy if exists "weeks admin"          on public.weeks;

drop policy if exists "problems read"        on public.problems;
drop policy if exists "problems admin"       on public.problems;

drop policy if exists "attempts self insert" on public.attempts;
drop policy if exists "attempts self read"   on public.attempts;

-- ---------------------------------------------------------------------
-- ตาราง roster: ถ้า SCIM 105 ยังไม่เคยรัน sql/05_class_list.sql ตารางนี้ถูก
-- สร้างขึ้นโดยสคริปต์ของ SCMA 251 (คอลัมน์ตรงกับที่ admin.html ใช้พอดี จึงใช้
-- งานได้ปกติ)  ถ้าอยากลบทิ้งให้ปลดคอมเมนต์บรรทัดล่าง — ข้อมูลรายชื่อจะหายด้วย
-- ---------------------------------------------------------------------
-- drop policy if exists "roster admin" on public.roster;
-- drop table if exists public.roster;

-- ตรวจผลลัพธ์: ควรเหลือเฉพาะ policy ชื่อแบบ "weeks: everyone reads" ฯลฯ
select tablename, policyname, cmd
from pg_policies where schemaname = 'public'
order by tablename, policyname;
