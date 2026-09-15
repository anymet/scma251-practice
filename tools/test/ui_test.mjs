/* End-to-end check of the website in headless Chromium.

     node tools/test/ui_test.mjs [--section 21] [--shots DIR]

   * serves the project folder on http://127.0.0.1:8765
   * replaces the CDN libraries with local copies (VENDOR env var points at a
     folder holding node_modules/{katex,codemirror} and a pyodide/ distribution)
   * replaces supabase-js with tools/test/mock_supabase.js
   * for every problem of the bank: opens it, answers it correctly with the
     reference solution, presses check/run and expects a pass; for order and
     spot problems also tries one wrong answer first and expects a fail.
   Exit code 1 if any problem does not behave. */
import { chromium } from "playwright";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const VENDOR = process.env.VENDOR || "/tmp/vendor";
const args = process.argv.slice(2);
const onlySection = args.includes("--section") ? parseInt(args[args.indexOf("--section") + 1], 10) : null;
const SHOTS = args.includes("--shots") ? args[args.indexOf("--shots") + 1] : null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

const bank = JSON.parse(fs.readFileSync(path.join(ROOT, "assets", "problem_bank.json"), "utf8"));
const sols = JSON.parse(fs.readFileSync(path.join(ROOT, "bank", "solutions.json"), "utf8"));

/* ---------------- static server ---------------- */
const PORT = 8765;
const server = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], { cwd: ROOT, stdio: "ignore" });
await new Promise(r => setTimeout(r, 800));
const BASE = `http://127.0.0.1:${PORT}/`;

/* ---------------- CDN -> local files ---------------- */
const CM = path.join(VENDOR, "node_modules", "codemirror");
const KATEX = path.join(VENDOR, "node_modules", "katex", "dist");
const PYODIDE = path.join(VENDOR, "pyodide");
const MIME = { ".js": "application/javascript", ".css": "text/css", ".json": "application/json", ".wasm": "application/wasm",
               ".whl": "application/octet-stream", ".zip": "application/zip", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf" };
function local(file) {
  const ext = path.extname(file);
  return { status: 200, contentType: MIME[ext] || "application/octet-stream", body: fs.readFileSync(file) };
}
function mapUrl(url) {
  const u = new URL(url);
  const p = u.pathname;
  if (u.host === "fonts.googleapis.com") return { status: 200, contentType: "text/css", body: "" };
  if (u.host === "fonts.gstatic.com") return { status: 404, body: "" };
  if (u.host === "cdnjs.cloudflare.com") {
    let m;
    if ((m = /codemirror\/5\.65\.16\/(.*)$/.exec(p))) {
      const rel = m[1].replace(".min.", ".").replace(/^codemirror\.(js|css)$/, "lib/codemirror.$1");
      return local(path.join(CM, rel));
    }
    if ((m = /KaTeX\/0\.16\.9\/(.*)$/.exec(p))) return local(path.join(KATEX, m[1]));
  }
  if (u.host === "cdn.jsdelivr.net") {
    if (p.startsWith("/npm/@supabase/supabase-js")) return local(path.join(ROOT, "tools", "test", "mock_supabase.js"));
    let m;
    if ((m = /\/pyodide\/v0\.26\.4\/full\/(.*)$/.exec(p))) {
      const f = path.join(PYODIDE, m[1]);
      return fs.existsSync(f) ? local(f) : { status: 404, body: "" };
    }
  }
  return null;
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
await ctx.route("**/*", async (route) => {
  const url = route.request().url();
  if (url.startsWith(BASE)) {
    if (url.startsWith(BASE + "assets/config.js")) {
      const cfg = fs.readFileSync(path.join(ROOT, "assets", "config.js"), "utf8")
        .replace(/SUPABASE_URL:\s*"[^"]*"/, 'SUPABASE_URL: "https://test.supabase.co"')
        .replace(/SUPABASE_ANON_KEY:\s*"[^"]*"/, 'SUPABASE_ANON_KEY: "test-key"')
        .replace(/LOCK_LEVELS:\s*true/, "LOCK_LEVELS: false");
      return route.fulfill({ status: 200, contentType: "application/javascript", body: cfg });
    }
    return route.continue();
  }
  const r = mapUrl(url);
  if (r) return route.fulfill(r);
  console.log("  (blocked)", url);
  return route.fulfill({ status: 404, body: "" });
});

const page = await ctx.newPage();
page.on("dialog", d => d.accept());
const problems = [];
page.on("console", m => { if (m.type() === "error") problems.push("console error: " + m.text()); });
page.on("pageerror", e => problems.push("page error: " + e.message));

let failures = 0;
const fail = (m) => { failures++; console.log("  FAIL", m); };
const ok = (m) => console.log("  ok  ", m);

/* ---------------- index ---------------- */
await page.goto(BASE + "index.html");
await page.waitForSelector(".week-card", { timeout: 10000 });
const cards = await page.$$eval(".week-card", els => els.map(e => e.className));
ok(`index: ${cards.length} section cards, ${cards.filter(c => c.includes("open")).length} open`);
if (SHOTS) await page.screenshot({ path: path.join(SHOTS, "index.png"), fullPage: true });

/* ---------------- each section ---------------- */
const sections = [...new Set(bank.problems.map(p => p.week_no))].filter(s => !onlySection || s === onlySection);
for (const sec of sections) {
  console.log(`\n== section ${sec}`);
  await page.goto(BASE + "section.html?s=" + sec);
  await page.waitForSelector("#problem-area:not(.hidden)", { timeout: 10000 });
  const items = bank.problems.filter(p => p.week_no === sec);
  for (const p of items) {
    const before = failures;
    try {
      await page.click(`.pitem[data-slug="${p.slug}"]`);
      await page.waitForFunction((t) => document.getElementById("p-title").dataset.slug === t, p.slug, { timeout: 5000 });
      /* maths rendered? */
      if (/\$/.test(p.statement)) {
        const k = await page.$$eval("#p-statement .katex", els => els.length);
        if (!k) fail(`${p.slug}: statement has $maths$ but nothing was typeset`);
        const leftover = await page.$eval("#p-statement", e =>
          [...e.childNodes].filter(n => n.nodeType === 3 && n.textContent.includes("$")).length);
        if (leftover) fail(`${p.slug}: a $ is left in the statement text`);
      }
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${p.slug}.png`), fullPage: true });

      if (p.type === "code") await doCode(p);
      else if (p.type === "cloze") await doCloze(p);
      else if (p.type === "spot") await doSpot(p);
      else if (p.type === "mcq") await doMcq(p);
      else if (p.type === "order") await doOrder(p);
      else if (p.type === "axioms") await doAxioms(p);
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${p.slug}-result.png`), fullPage: true });
    } catch (e) {
      fail(`${p.slug}: ${e.message.split("\n")[0]}`);
    }
    if (failures === before) ok(`${p.slug} (${p.type})`);
  }
}

async function expectResult(box, pass, what) {
  await page.waitForSelector(`${box} .result-head`, { timeout: 120000 });
  const cls = await page.$eval(`${box} .result-head`, e => e.className);
  const msg = await page.$eval(`${box} .result-head .msg`, e => e.textContent);
  if (pass && !cls.includes("pass")) fail(`${what}: expected PASS, got "${msg}"`);
  if (!pass && !cls.includes("fail")) fail(`${what}: expected FAIL, got "${msg}"`);
  return msg;
}

async function doCode(p) {
  const sol = sols[p.slug];
  await page.evaluate((code) => document.querySelector("#coder .CodeMirror").CodeMirror.setValue(code), sol);
  await page.click("#run");
  await expectResult("#results", true, p.slug);
  const n = await page.$$eval("#results .tcase.ok", els => els.length);
  if (n !== p.tests.length) fail(`${p.slug}: ${n}/${p.tests.length} tests shown ok`);
}

async function doCloze(p) {
  for (const [id, b] of Object.entries(p.spec.blanks)) {
    await page.click(`.blank[data-id="${id}"]`);
    await page.waitForSelector(".blank-menu .choice");
    const n = await page.$$eval(".blank-menu .choice", els => els.length);
    if (n !== b.choices.length) fail(`${p.slug}: blank ${id} shows ${n} choices`);
    await page.click(`.blank-menu .choice[data-i="${b.answer}"]`);
  }
  await page.click("#quiz-check");
  await expectResult("#quiz-results", true, p.slug);
}

async function doSpot(p) {
  /* wrong first */
  const wrongLine = (p.spec.wrong + 1) % p.spec.lines.length;
  await page.click(`.spot .line[data-i="${wrongLine}"]`);
  await page.click(`.spot .reason[data-i="${p.spec.reason_answer}"]`);
  await page.click("#quiz-check");
  await expectResult("#quiz-results", false, p.slug + " (wrong line)");
  await page.click(`.spot .line[data-i="${p.spec.wrong}"]`);
  await page.click(`.spot .reason[data-i="${p.spec.reason_answer}"]`);
  await page.click("#quiz-check");
  await expectResult("#quiz-results", true, p.slug);
}

async function doMcq(p) {
  const ans = Array.isArray(p.spec.answer) ? p.spec.answer : [p.spec.answer];
  for (const i of ans) await page.click(`.mcq .choice[data-i="${i}"]`);
  await page.click("#quiz-check");
  await expectResult("#quiz-results", true, p.slug);
}

async function doOrder(p) {
  const sol = p.spec.solution || p.spec.blocks.map(b => b.id);
  /* wrong first: a distractor, then the solution reversed */
  if (p.spec.distractors && p.spec.distractors.length) {
    await page.click(`.pool .block[data-id="${p.spec.distractors[0].id}"] .btxt`);
  }
  for (const id of sol.slice().reverse()) await page.click(`.pool .block[data-id="${id}"] .btxt`);
  await page.click("#quiz-check");
  const msg = await expectResult("#quiz-results", false, p.slug + " (wrong order)");
  if (!/ลำดับ|ไม่ควร/.test(msg)) fail(`${p.slug}: wrong-order message odd: ${msg}`);
  await page.click("#quiz-reset");
  await page.waitForSelector(".proof .empty");
  for (const id of sol) await page.click(`.pool .block[data-id="${id}"] .btxt`);
  const n = await page.$$eval(".proof .block", els => els.length);
  if (n !== sol.length) fail(`${p.slug}: proof list has ${n} blocks`);
  await page.click("#quiz-check");
  await expectResult("#quiz-results", true, p.slug);
}

async function doAxioms(p) {
  const sol = sols[p.slug] || {};
  for (const it of p.spec.items) {
    await page.click(`.axiom[data-id="${it.id}"] .pick[data-mark="${it.holds ? "holds" : "fails"}"]`);
    if (!it.holds) {
      const c = (sol.counter || {})[it.id] || {};
      for (const [v, val] of Object.entries(c)) {
        await page.fill(`.axiom[data-id="${it.id}"] input[data-var="${v}"]`, String(val));
      }
    }
  }
  await page.click(`.verdict .pick[data-v="${p.spec.verdict ? 1 : 0}"]`);
  await page.click("#quiz-check");
  await expectResult("#quiz-results", true, p.slug);
}

/* ---------------- confirm the page is talking to the database ---------------- */
await page.goto(BASE + "section.html?s=" + sections[0]);
await page.waitForSelector("#problem-area:not(.hidden)");
const log = await page.evaluate(() => window.__mockLog.length);
ok(`mock database saw ${log} write(s) on the last page load (login)`);

/* ---------------- admin: bank import preview ---------------- */
await page.goto(BASE + "admin.html");
await page.waitForSelector("#admin:not(.hidden)", { timeout: 10000 });
await page.click('.tab[data-tab="bank"]');
await page.fill("#bk-paste", JSON.stringify(bank));
await page.click("#bk-preview");
await page.waitForSelector("#bk-report .result-head");
const rep = await page.$eval("#bk-report .result-head", e => e.className + " | " + e.textContent.trim().slice(0, 120));
if (!rep.includes("pass")) fail("admin bank preview: " + rep); else ok("admin bank preview: " + rep);
await page.click("#bk-import");
await page.waitForFunction(() => /Done/.test(document.getElementById("bk-report").textContent), null, { timeout: 15000 });
ok("admin bank import ran");
await page.click('.tab[data-tab="problems"]');
await page.waitForSelector("#pb-table tr");
if (SHOTS) await page.screenshot({ path: path.join(SHOTS, "admin.png"), fullPage: true });

const errs = problems.filter(m => !/favicon|fonts\.gstatic|404/.test(m));
errs.forEach(m => fail(m));
await browser.close();
server.kill();
console.log(failures ? `\n${failures} failure(s)` : "\nALL GOOD");
process.exit(failures ? 1 : 0);
