-- =====================================================================
--  SCMA 251 · the section cards (one per section of the lecture notes)
--  week_no = chapter*10 + section   (2.1 → 21, 3.4 → 34, 4.4 → 44)
--  Every card starts CLOSED; open a section from the Admin page after class.
--  Safe to run again: existing rows are updated, not duplicated.
-- =====================================================================
insert into public.weeks (week_no, display_no, label, chapter, title, subtitle, sort_order, is_open) values
 (21, 21, '2.1', 2, 'ปริภูมิเวกเตอร์ (Vector space)',            'field, สัจพจน์ VS1–VS10, ตัวอย่างการตรวจสอบ',             21, false),
 (22, 22, '2.2', 2, 'ปริภูมิย่อย (Subspace)',                    'ทฤษฎี 2.2.1–2.2.3 และการตรวจสอบเซตย่อย',                 22, false),
 (23, 23, '2.3', 2, 'การเป็นอิสระเชิงเส้น (Linear independence)','linear combination, span, dependent / independent',       23, false),
 (24, 24, '2.4', 2, 'ฐานหลักและมิติ (Basis and dimension)',      'basis, dimension, coordinate vector',                     24, false),
 (25, 25, '2.5', 2, 'ผลคูณภายใน (Inner product)',                 'นิยาม สัจพจน์ของ inner product, norm',                   25, false),
 (26, 26, '2.6', 2, 'มุมและการตั้งฉากใน inner product space',     'Cauchy–Schwarz, มุมระหว่างเวกเตอร์',                     26, false),
 (27, 27, '2.7', 2, 'การตั้งฉาก (Orthogonality)',                 'orthogonal / orthonormal set, orthogonal complement',     27, false),
 (28, 28, '2.8', 2, 'กระบวนการ Gram–Schmidt',                     'สร้าง orthonormal basis, QR',                             28, false),
 (31, 31, '3.1', 3, 'ดีเทอร์มิแนนต์ (Determinant)',                'cofactor expansion, det ของผลคูณ, row operations',        31, false),
 (32, 32, '3.2', 3, 'ค่าลักษณะเฉพาะ (Eigenvalues)',                'characteristic polynomial',                              32, false),
 (33, 33, '3.3', 3, 'เวกเตอร์ลักษณะเฉพาะ (Eigenvectors)',          'eigenspace, การหา eigenvector',                          33, false),
 (34, 34, '3.4', 3, 'ค่าลักษณะเฉพาะซ้ำ (Repeated eigenvalues)',    'algebraic / geometric multiplicity, defective matrix',    34, false),
 (35, 35, '3.5', 3, 'การทำเป็นเมทริกซ์ทแยงมุม (Diagonalization)', 'A = PDP⁻¹, เงื่อนไขการ diagonalize ได้',                  35, false),
 (36, 36, '3.6', 3, 'รูปแบบจอร์แดน (Jordan form)',                'generalized eigenvector, Jordan block',                   36, false),
 (41, 41, '4.1', 4, 'การแปลงเชิงเส้น (Linear transformation)',     'นิยาม การตรวจสอบความเป็นเชิงเส้น เมทริกซ์มาตรฐาน',        41, false),
 (42, 42, '4.2', 4, 'เคอร์เนลและเรนจ์ (Kernel and range)',          'nullity, rank, rank–nullity theorem',                    42, false),
 (43, 43, '4.3', 4, 'onto, one-to-one และการแปลงประกอบ',           'isomorphism, composition',                               43, false),
 (44, 44, '4.4', 4, 'การเปลี่ยนฐานหลัก (Change of basis)',          'coordinate map, transition matrix, similar matrices',    44, false)
on conflict (week_no) do update set
  label = excluded.label, chapter = excluded.chapter, title = excluded.title,
  subtitle = excluded.subtitle, sort_order = excluded.sort_order;
