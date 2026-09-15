/* =====================================================================
   SCMA 251 Practice - shared helpers (auth, database, small utilities)
   Loaded by index.html, week.html and admin.html.
   ===================================================================== */
(function () {
  const CFG = window.SCIM_CONFIG || {};
  const configured =
    CFG.SUPABASE_URL && !CFG.SUPABASE_URL.includes("PASTE-YOUR") &&
    CFG.SUPABASE_ANON_KEY && !CFG.SUPABASE_ANON_KEY.includes("PASTE-YOUR");

  const sb = configured
    ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY)
    : null;

  const esc = (s) => String(s === null || s === undefined ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  function toast(message, kind) {
    const el = document.createElement("div");
    el.className = "toast " + (kind || "");
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3800);
  }

  function initials(name, email) {
    const source = (name || email || "?").trim();
    const parts = source.split(/[\s.@_]+/).filter(Boolean);
    return ((parts[0] || "?")[0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
  }

  function firstName(name, email) {
    if (name) return name.trim().split(/\s+/)[0];
    return (email || "").split("@")[0];
  }

  const domainAllowed = (email) =>
    (CFG.ALLOWED_DOMAINS || []).some((d) => String(email || "").toLowerCase().endsWith("@" + d));

  async function signIn() {
    if (!sb) { alert("เว็บนี้ยังไม่ได้เชื่อมกับ Supabase — ดู assets/config.js"); return; }
    const redirectTo = location.origin + location.pathname.replace(/[^/]*$/, "index.html");
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, queryParams: { prompt: "select_account" } }
    });
    if (error) alert("เข้าสู่ระบบไม่สำเร็จ: " + error.message);
  }

  async function signOut() {
    if (sb) await sb.auth.signOut();
    sessionStorage.clear();
    location.href = "index.html";
  }

  /* Returns {user, profile} when signed in with an allowed e-mail,
     or null when not signed in.  Rejected domains are signed out. */
  async function getSession() {
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    const session = data ? data.session : null;
    if (!session) return null;
    const user = session.user;
    if (!domainAllowed(user.email)) {
      await sb.auth.signOut();
      alert("กรุณาเข้าสู่ระบบด้วยบัญชี Mahidol (" +
            (CFG.ALLOWED_DOMAINS || []).join(", ") + ")");
      return null;
    }
    let profile = null;
    const res = await sb.from("profiles").select("*").eq("id", user.id).maybeSingle();
    profile = res.data;
    if (!profile) {                                   // first ever visit
      await sb.from("profiles").upsert({
        id: user.id, email: user.email,
        full_name: user.user_metadata.full_name || user.user_metadata.name || null
      });
      const again = await sb.from("profiles").select("*").eq("id", user.id).maybeSingle();
      profile = again.data;
    }
    return {
      user,
      profile: profile || { id: user.id, email: user.email, is_admin: false },
      name: user.user_metadata.full_name || user.user_metadata.name || user.email,
      email: user.email
    };
  }

  /* One login row per browser session (so refreshing does not spam the table). */
  async function recordLogin(ctx) {
    if (!sb || sessionStorage.getItem("scma_login_logged")) return;
    sessionStorage.setItem("scma_login_logged", "1");
    await sb.from("logins").insert({
      user_id: ctx.user.id, email: ctx.email, full_name: ctx.name,
      user_agent: navigator.userAgent.slice(0, 250)
    });
    await sb.from("profiles").update({ last_login_at: new Date().toISOString() })
      .eq("id", ctx.user.id);
  }

  /* ---------------- light / dark ----------------
     The choice is kept per browser. With nothing chosen we follow whatever
     the computer is set to. A tiny script in each page's <head> applies it
     before anything is painted, so the page never flashes the wrong colour. */
  const THEME_KEY = "scma251:theme";
  const savedTheme = () => { try { return localStorage.getItem(THEME_KEY) || ""; } catch (e) { return ""; } };
  const systemTheme = () =>
    (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) ? "light" : "dark";

  function applyTheme(name) {
    document.documentElement.setAttribute("data-theme", name);
    document.querySelectorAll("[data-theme-toggle]").forEach((b) => {
      b.textContent = name === "light" ? "\u{1F319}" : "\u2600\uFE0F";
      b.title = name === "light" ? "สลับเป็นธีมมืด" : "สลับเป็นธีมสว่าง";
    });
    window.dispatchEvent(new CustomEvent("scim-theme", { detail: name }));
  }

  function initTheme() {
    applyTheme(savedTheme() || systemTheme());
    document.querySelectorAll("[data-theme-toggle]").forEach((b) => {
      b.onclick = () => {
        const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
        try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
        applyTheme(next);
      };
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initTheme);
  else initTheme();

  function fillHeader(ctx) {
    const av = document.querySelector("[data-avatar]");
    const wh = document.querySelector("[data-who]");
    if (av) av.textContent = initials(ctx.name, ctx.email);
    if (wh) wh.innerHTML = "<b>" + esc(ctx.name) + "</b>";
    document.querySelectorAll("[data-signout]").forEach((b) => (b.onclick = signOut));
    const adminLink = document.querySelector("[data-admin-link]");
    if (adminLink && ctx.profile && ctx.profile.is_admin) adminLink.classList.remove("hidden");
  }

  /* ---------------- maths ----------------
     Statements are HTML that may contain $...$ / $$...$$ / \( \) / \[ \].
     KaTeX (loaded by the page) turns them into typeset maths. */
  function math(el) {
    if (!el || !window.renderMathInElement) return;
    try {
      window.renderMathInElement(el, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "\\[", right: "\\]", display: true },
          { left: "\\(", right: "\\)", display: false },
          { left: "$", right: "$", display: false }
        ],
        throwOnError: false, strict: "ignore"
      });
    } catch (e) { /* leave the raw text */ }
  }

  window.SCIM = {
    cfg: CFG, sb, configured, esc, toast, initials, firstName,
    signIn, signOut, getSession, recordLogin, fillHeader, domainAllowed,
    applyTheme, initTheme, math,
    isLight: () => document.documentElement.getAttribute("data-theme") === "light"
  };
})();
