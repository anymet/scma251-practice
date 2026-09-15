/* =====================================================================
   SCMA 251 Practice - THE ONLY FILE YOU NORMALLY NEED TO EDIT BY HAND
   Fill in the two values from Supabase (Settings -> API), then save.
   ===================================================================== */
window.SCIM_CONFIG = {

  // 1) Supabase -> Settings -> Data API -> Project URL
  SUPABASE_URL: "https://PASTE-YOUR-PROJECT.supabase.co",

  // 2) Supabase -> Settings -> API Keys -> "Publishable key" (sb_publishable_...)
  //    A project made before 2025 shows a legacy "anon public" key instead;
  //    either one works here. Both are safe to publish.
  //    NEVER paste a "secret" / "service_role" key - it bypasses every rule.
  SUPABASE_ANON_KEY: "PASTE-YOUR-PUBLISHABLE-KEY",

  // 3) Only e-mails ending with these domains are allowed in.
  ALLOWED_DOMAINS: [
    "student.mahidol.ac.th",
    "student.mahidol.edu",
    "mahidol.ac.th",
    "mahidol.edu"
  ],

  // 4) Wording shown in the page header
  COURSE_CODE: "SCMA 251",
  COURSE_NAME: "Linear Algebra · แบบฝึกหัดท้าย section",

  // 5) How many seconds a student's program may run before we stop it
  RUN_TIMEOUT_SECONDS: 6,

  // 6) Must a level be finished before the next one opens?  (true = yes)
  LOCK_LEVELS: true,

  // 6b) Levels that are ALWAYS open, even when LOCK_LEVELS is on.
  //     Level 2 (เรียงการพิสูจน์) is here because those proofs are done in
  //     class, so students should be able to go straight to them.
  OPEN_LEVELS: [2],

  // 6c) Which level must be FINISHED before another one opens.
  //     Anything not listed here waits for the level right above it, so the
  //     line below means: level 3 opens as soon as level 1 is done, and
  //     level 4 still waits for level 3.
  UNLOCK_AFTER: { 3: 1 },

  // 7) Proof-ordering questions: after this many wrong tries the page starts
  //    to point at the first misplaced block.
  ORDER_HINT_AFTER: 3
};
