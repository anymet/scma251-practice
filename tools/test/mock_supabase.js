/* A tiny stand-in for supabase-js, used ONLY by tools/test/ui_test.mjs.
   It answers the handful of query shapes the pages use, reading sections and
   problems from assets/problem_bank.json and keeping attempts in memory.
   Every section that has problems is reported as open. */
(function () {
  const user = { id: "u-test", email: "test@student.mahidol.ac.th",
                 user_metadata: { full_name: "Test Student" } };
  const mem = { profiles: [{ id: "u-test", email: user.email, full_name: "Test Student", is_admin: true }],
                attempts: [], logins: [], roster: [], weeks: null, problems: null };
  let bankPromise = null;
  function bank() {
    if (!bankPromise) {
      bankPromise = fetch("assets/problem_bank.json").then(r => r.json()).then(b => {
        mem.weeks = b.weeks.map((w, i) => Object.assign({ id: i + 1 }, w,
          { is_open: b.problems.some(p => p.week_no === w.week_no) }));
        mem.problems = b.problems.map((p, i) => Object.assign({ id: i + 1 }, p));
      });
    }
    return bankPromise;
  }

  function builder(table) {
    const q = { table, filters: [], order: [], op: "select", payload: null, single: false, limit: null };
    const api = {
      select() { q.op = q.op === "select" ? "select" : q.op; return api; },
      eq(k, v) { q.filters.push([k, v]); return api; },
      order(k, opt) { q.order.push([k, !(opt && opt.ascending === false)]); return api; },
      limit(n) { q.limit = n; return api; },
      maybeSingle() { q.single = true; return api; },
      insert(rows) { q.op = "insert"; q.payload = rows; return api; },
      upsert(rows, opt) { q.op = "upsert"; q.payload = rows; q.onConflict = opt && opt.onConflict; return api; },
      update(row) { q.op = "update"; q.payload = row; return api; },
      delete() { q.op = "delete"; return api; },
      then(ok, bad) { return run().then(ok, bad); }
    };
    async function run() {
      await bank();
      let rows = mem[table] || [];
      const match = (r) => q.filters.every(([k, v]) => r[k] === v);
      if (q.op === "select") {
        let out = rows.filter(match);
        q.order.forEach(([k, asc]) => out.sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * (asc ? 1 : -1)));
        if (q.limit) out = out.slice(0, q.limit);
        return { data: q.single ? (out[0] || null) : out, error: null };
      }
      if (q.op === "insert") {
        const list = Array.isArray(q.payload) ? q.payload : [q.payload];
        list.forEach(r => rows.push(Object.assign({ id: rows.length + 1, created_at: new Date().toISOString() }, r)));
        window.__mockLog.push({ table, op: "insert", n: list.length, rows: list });
        return { data: null, error: null };
      }
      if (q.op === "upsert") {
        const list = Array.isArray(q.payload) ? q.payload : [q.payload];
        const key = q.onConflict || "id";
        list.forEach(r => {
          const i = rows.findIndex(x => x[key] === r[key]);
          if (i > -1) rows[i] = Object.assign({}, rows[i], r); else rows.push(Object.assign({ id: rows.length + 1 }, r));
        });
        window.__mockLog.push({ table, op: "upsert", n: list.length });
        return { data: null, error: null };
      }
      if (q.op === "update") {
        rows.filter(match).forEach(r => Object.assign(r, q.payload));
        return { data: null, error: null };
      }
      if (q.op === "delete") {
        mem[table] = rows.filter(r => !match(r));
        return { data: null, error: null };
      }
      return { data: null, error: { message: "unsupported" } };
    }
    return api;
  }

  window.__mockLog = [];
  window.__mock = mem;
  window.supabase = {
    createClient() {
      return {
        from: builder,
        auth: {
          getSession: async () => ({ data: { session: { user } } }),
          signInWithOAuth: async () => ({ error: null }),
          signOut: async () => ({})
        }
      };
    }
  };
})();
