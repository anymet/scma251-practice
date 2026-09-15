-- รันไฟล์นี้ก่อน ถ้าเจอ ERROR: column "label" of relation "weeks" does not exist
-- (ตาราง weeks/problems มีอยู่แล้ว จึงยังไม่มีคอลัมน์ใหม่) แล้วรัน 02_seed_sections.sql อีกครั้ง
alter table public.weeks    add column if not exists label   text;
alter table public.weeks    add column if not exists chapter int;
alter table public.problems add column if not exists type    text not null default 'code';
alter table public.problems add column if not exists spec    jsonb;
