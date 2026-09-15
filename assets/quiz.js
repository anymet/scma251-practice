/* =====================================================================
   SCMA 251 Practice - the non-code question types
   Loaded by section.html.  window.LAQ.render(problem, container, ctx)
   draws the widget for problem.type and returns a controller:
       grade()  -> Promise of {ok, score, total, message, html, answer}
       reset()  -> forget the student's draft and redraw

   Types and the shape of problem.spec
   -----------------------------------
   order   Proof Blocks: put the lines of a proof in order; some lines are
           distractors that do not belong.
           { blocks:[{id,text}], distractors:[{id,text,why}],
             deps:[[before,after],...]   (optional: any order that respects
                                          them passes; default = solution order)
             solution:[id,...], hint }
   cloze   A proof with gaps; each gap is a small menu of choices.
           { text:"... {{1}} ... {{2}} ...", blanks:{ "1":{choices:[...],answer:0}, ... }, hint }
   spot    One line of a proof is wrong: click it and say why.
           { lines:[...], wrong:2, reasons:[...], reason_answer:1, explain, hint }
   mcq     Choose one or several.
           { choices:[...], answer:0 | [0,2], multi:false, explain, hint }
   axioms  Vector-space check list: for every axiom say holds / fails, and
           back a "fails" with a counterexample that is checked with numpy.
           { setup:"python defining add(u,v), smul(a,u), in_set(u)",
             items:[{id,label,holds,vars:[...],scalars:[...],check:"expr True when it holds"}],
             verdict:true|false, var_hint, hint }
   Text fields are HTML and may contain $LaTeX$.
   ===================================================================== */
(function () {
  const KEY = (p) => "scma251:q:" + p.slug;
  const TRIES = (p) => "scma251:tries:" + p.slug;

  const load = (p) => { try { return JSON.parse(localStorage.getItem(KEY(p)) || "null"); } catch (e) { return null; } };
  const store = (p, v) => { try { localStorage.setItem(KEY(p), JSON.stringify(v)); } catch (e) {} };
  const tries = (p) => { try { return parseInt(localStorage.getItem(TRIES(p)) || "0", 10); } catch (e) { return 0; } };
  const bumpTries = (p) => { const n = tries(p) + 1; try { localStorage.setItem(TRIES(p), String(n)); } catch (e) {} return n; };
  const hintAfter = () => (window.SCIM && window.SCIM.cfg.ORDER_HINT_AFTER) || 3;

  const esc = (s) => window.SCIM.esc(s);
  const math = (el) => window.SCIM.math(el);
  const el = (html) => { const d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstElementChild; };
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const sameSet = (a, b) => a.length === b.length && a.every(x => b.indexOf(x) > -1);
  const hintBox = (p, n) => {
    const h = p.spec && p.spec.hint;
    if (!h || n < hintAfter()) return "";
    return '<div class="note">💡 <b>คำใบ้:</b> ' + h + "</div>";
  };
  const explainBox = (p) => (p.spec && p.spec.explain) ? '<div class="explain">' + p.spec.explain + "</div>" : "";

  /* ================================================================ order */
  function renderOrder(p, box, ctx) {
    const spec = p.spec || {};
    const all = {};
    (spec.blocks || []).forEach(b => { all[b.id] = b; });
    (spec.distractors || []).forEach(b => { all[b.id] = Object.assign({ distractor: true }, b); });
    const blockIds = (spec.blocks || []).map(b => b.id);
    const disIds = (spec.distractors || []).map(b => b.id);
    const deps = (spec.deps && spec.deps.length) ? spec.deps
      : (spec.solution || blockIds).slice(1).map((id, i) => [(spec.solution || blockIds)[i], id]);

    let state = load(p);
    if (!state || !Array.isArray(state.pool) || !Array.isArray(state.proof) ||
        !sameSet(state.pool.concat(state.proof), Object.keys(all))) {
      state = { pool: shuffle(Object.keys(all)), proof: [] };
      store(p, state);
    }
    let marks = {};                          // id -> "bad" | "misplaced"  (after several tries)

    function draw() {
      box.innerHTML =
        '<div class="order">' +
          '<div class="order-col"><h4>กล่องข้อความ <span>คลิก หรือลากไปทางขวา</span></h4>' +
            '<ul class="blocks pool" data-list="pool"></ul></div>' +
          '<div class="order-col"><h4>การพิสูจน์ของคุณ <span>เรียงจากบนลงล่าง</span></h4>' +
            '<ul class="blocks proof" data-list="proof"></ul></div>' +
        "</div>";
      const pool = box.querySelector(".pool"), proof = box.querySelector(".proof");
      state.pool.forEach(id => pool.appendChild(blockEl(id, "pool")));
      state.proof.forEach((id, i) => proof.appendChild(blockEl(id, "proof", i)));
      if (!state.proof.length) proof.appendChild(el('<li class="empty">ยังว่าง — คลิกข้อความทางซ้าย</li>'));
      [pool, proof].forEach(list => {
        list.ondragover = (e) => { e.preventDefault(); list.classList.add("over"); };
        list.ondragleave = () => list.classList.remove("over");
        list.ondrop = (e) => {
          e.preventDefault(); list.classList.remove("over");
          const id = e.dataTransfer.getData("text/plain");
          if (!id) return;
          const target = list.dataset.list;
          const after = [...list.querySelectorAll("li.block")].find(li =>
            e.clientY < li.getBoundingClientRect().top + li.offsetHeight / 2);
          move(id, target, after ? after.dataset.id : null);
        };
      });
      math(box);
    }

    function blockEl(id, where, i) {
      const b = all[id];
      const li = el('<li class="block' + (marks[id] ? " " + marks[id] : "") + '" draggable="true" data-id="' + esc(id) + '">' +
        (where === "proof" ? '<span class="num">' + (i + 1) + "</span>" : "") +
        '<div class="btxt">' + b.text + "</div>" +
        (where === "proof"
          ? '<span class="ctl"><button title="เลื่อนขึ้น" data-act="up">▲</button>' +
            '<button title="เลื่อนลง" data-act="down">▼</button><button title="เอาออก" data-act="out">✕</button></span>'
          : '<span class="ctl"><button title="เพิ่มเข้าการพิสูจน์" data-act="in">+</button></span>') +
        "</li>");
      li.ondragstart = (e) => { e.dataTransfer.setData("text/plain", id); li.classList.add("drag"); };
      li.ondragend = () => li.classList.remove("drag");
      li.querySelector(".btxt").onclick = () => { if (where === "pool") move(id, "proof", null); };
      li.querySelectorAll("button").forEach(bt => bt.onclick = (e) => {
        e.stopPropagation();
        const act = bt.dataset.act, k = state.proof.indexOf(id);
        if (act === "in") move(id, "proof", null);
        else if (act === "out") move(id, "pool", null);
        else if (act === "up" && k > 0) { state.proof.splice(k, 1); state.proof.splice(k - 1, 0, id); commit(); }
        else if (act === "down" && k < state.proof.length - 1) { state.proof.splice(k, 1); state.proof.splice(k + 1, 0, id); commit(); }
      });
      return li;
    }

    /* put `id` into list `target`, just before `beforeId` (or at the end) */
    function move(id, target, beforeId) {
      if (id === beforeId) return;
      ["pool", "proof"].forEach(l => { const k = state[l].indexOf(id); if (k > -1) state[l].splice(k, 1); });
      const at = beforeId ? state[target].indexOf(beforeId) : -1;
      if (at < 0) state[target].push(id);
      else state[target].splice(at, 0, id);
      commit();
    }
    function commit() { marks = {}; store(p, state); draw(); }
    draw();

    return {
      reset() { localStorage.removeItem(KEY(p)); state = { pool: shuffle(Object.keys(all)), proof: [] }; store(p, state); marks = {}; draw(); },
      async grade() {
        const proof = state.proof;
        const pos = {}; proof.forEach((id, i) => { pos[id] = i; });
        const usedDis = proof.filter(id => disIds.indexOf(id) > -1);
        const missing = blockIds.filter(id => proof.indexOf(id) === -1);
        const broken = deps.filter(([a, b]) => (a in pos) && (b in pos) && pos[a] > pos[b]);
        const ok = !usedDis.length && !missing.length && !broken.length;
        const total = blockIds.length;
        const score = Math.max(0, total - usedDis.length - missing.length - broken.length);
        const n = ok ? tries(p) : bumpTries(p);

        const notes = [];
        if (usedDis.length) notes.push("มีข้อความที่ไม่ควรอยู่ในการพิสูจน์ " + usedDis.length + " ข้อ");
        if (missing.length) notes.push("ยังขาดข้อความที่จำเป็น " + missing.length + " ข้อ");
        if (broken.length) notes.push("ลำดับยังไม่ถูก (" + broken.length + " คู่ที่สลับกัน)");

        marks = {};
        let html = "";
        if (!ok && n >= hintAfter()) {
          usedDis.forEach(id => { marks[id] = "bad"; });
          /* the first block (top to bottom) that sits above something it needs */
          const firstBad = proof.find(id => broken.some(([a, b]) => b === id));
          if (firstBad) marks[firstBad] = "misplaced";
          html += '<div class="note">💡 ทำผิดหลายครั้งแล้ว จึงช่วยชี้ให้: กรอบ<b>สีแดง</b> = ไม่ควรอยู่ในการพิสูจน์, กรอบ<b>สีเหลือง</b> = ' +
                  "บรรทัดแรกที่ยังมาก่อนสิ่งที่มันต้องพึ่งพา</div>";
          draw();
        } else if (ok) {
          draw();
          const whys = (spec.distractors || []).filter(d => d.why).map(d =>
            '<li><span class="dis">' + d.text + "</span><br><small>" + d.why + "</small></li>").join("");
          if (whys) html += '<div class="explain"><b>ข้อความที่เป็นตัวหลอก และเหตุผลที่ไม่ใช้:</b><ul>' + whys + "</ul></div>";
          html += explainBox(p);
        }
        html += hintBox(p, n);
        return { ok, score, total, message: ok ? "" : ("ยังไม่ถูก — " + notes.join(" · ")), html, answer: { proof: proof } };
      }
    };
  }

  /* ================================================================ cloze */
  function renderCloze(p, box) {
    const spec = p.spec || {};
    const blanks = spec.blanks || {};
    const ids = Object.keys(blanks);
    let state = load(p) || {};
    let result = null;                       // after grading: id -> true/false

    function draw() {
      const parts = String(spec.text || "").split(/(\{\{\s*[^}]+\s*\}\})/);
      const html = parts.map(part => {
        const m = /^\{\{\s*([^}\s]+)\s*\}\}$/.exec(part);
        if (!m) return part;
        const id = m[1], b = blanks[id] || { choices: [] };
        const chosen = state[id];
        const cls = "blank" + (chosen === undefined ? " unset" : "") +
                    (result && result[id] === true ? " ok" : "") + (result && result[id] === false ? " no" : "");
        return '<span class="' + cls + '" data-id="' + esc(id) + '" tabindex="0">' +
               (chosen === undefined ? "▾ เลือก" : b.choices[chosen]) + "</span>";
      }).join("");
      box.innerHTML = '<div class="cloze">' + html + "</div>";
      math(box);
      box.querySelectorAll(".blank").forEach(sp => {
        sp.onclick = (e) => { e.stopPropagation(); openMenu(sp); };
        sp.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openMenu(sp); } };
      });
    }

    function closeMenu() { const m = document.querySelector(".blank-menu"); if (m) m.remove(); }
    document.addEventListener("click", closeMenu);
    function openMenu(sp) {
      closeMenu();
      const id = sp.dataset.id, b = blanks[id] || { choices: [] };
      const menu = el('<div class="blank-menu">' + b.choices.map((c, i) =>
        '<div class="choice' + (state[id] === i ? " on" : "") + '" data-i="' + i + '">' + c + "</div>").join("") + "</div>");
      document.body.appendChild(menu);
      math(menu);
      const r = sp.getBoundingClientRect();
      menu.style.left = Math.min(r.left + window.scrollX, window.scrollX + window.innerWidth - menu.offsetWidth - 12) + "px";
      menu.style.top = (r.bottom + window.scrollY + 6) + "px";
      menu.querySelectorAll(".choice").forEach(c => c.onclick = (e) => {
        e.stopPropagation();
        state[id] = parseInt(c.dataset.i, 10); result = null; store(p, state); closeMenu(); draw();
      });
    }
    draw();

    return {
      reset() { localStorage.removeItem(KEY(p)); state = {}; result = null; draw(); },
      async grade() {
        result = {};
        let score = 0;
        ids.forEach(id => { result[id] = (state[id] === blanks[id].answer); if (result[id]) score++; });
        const total = ids.length, ok = score === total;
        const n = ok ? tries(p) : bumpTries(p);
        draw();
        let html = ok ? explainBox(p) : "";
        html += hintBox(p, n);
        return { ok, score, total, message: ok ? "" : ("ถูก " + score + " จาก " + total + " ช่อง — ช่องสีแดงยังไม่ถูก"), html, answer: state };
      }
    };
  }

  /* ================================================================ spot */
  function renderSpot(p, box) {
    const spec = p.spec || {};
    let state = load(p) || {};
    let result = null;

    function draw() {
      box.innerHTML =
        '<div class="spot"><p class="lead">คลิกบรรทัดที่ผิด แล้วเลือกเหตุผล</p><ol class="lines">' +
        (spec.lines || []).map((t, i) => '<li class="line' + (state.line === i ? " on" : "") +
          (result && result.lineChosen === i ? (result.lineOk ? " ok" : " no") : "") +
          '" data-i="' + i + '"><span class="num">' + (i + 1) + "</span><div>" + t + "</div></li>").join("") +
        '</ol><h4>เพราะอะไร?</h4><ul class="reasons">' +
        (spec.reasons || []).map((t, i) => '<li class="reason' + (state.reason === i ? " on" : "") +
          (result && result.reasonChosen === i ? (result.reasonOk ? " ok" : " no") : "") +
          '" data-i="' + i + '"><span class="radio"></span><div>' + t + "</div></li>").join("") + "</ul></div>";
      math(box);
      box.querySelectorAll(".line").forEach(li => li.onclick = () => { state.line = +li.dataset.i; result = null; store(p, state); draw(); });
      box.querySelectorAll(".reason").forEach(li => li.onclick = () => { state.reason = +li.dataset.i; result = null; store(p, state); draw(); });
    }
    draw();

    return {
      reset() { localStorage.removeItem(KEY(p)); state = {}; result = null; draw(); },
      async grade() {
        const lineOk = state.line === spec.wrong;
        const reasonOk = state.reason === spec.reason_answer;
        result = { lineChosen: state.line, reasonChosen: state.reason, lineOk, reasonOk };
        const ok = lineOk && reasonOk, score = (lineOk ? 1 : 0) + (reasonOk ? 1 : 0);
        const n = ok ? tries(p) : bumpTries(p);
        draw();
        let msg = "";
        if (state.line === undefined || state.reason === undefined) msg = "เลือกทั้งบรรทัดและเหตุผลก่อน";
        else if (!lineOk) msg = "บรรทัดที่เลือกไม่ใช่จุดที่ผิด";
        else if (!reasonOk) msg = "เลือกบรรทัดถูกแล้ว แต่เหตุผลยังไม่ใช่";
        let html = ok ? explainBox(p) : "";
        html += hintBox(p, n);
        return { ok, score, total: 2, message: msg, html, answer: state };
      }
    };
  }

  /* ================================================================ mcq */
  function renderMcq(p, box) {
    const spec = p.spec || {};
    const answer = Array.isArray(spec.answer) ? spec.answer : [spec.answer];
    const multi = !!spec.multi;
    let state = load(p) || { picked: [] };

    function draw() {
      box.innerHTML = '<div class="mcq"><p class="lead">' + (multi ? "เลือกได้มากกว่าหนึ่งข้อ" : "เลือกหนึ่งข้อ") + '</p><ul>' +
        (spec.choices || []).map((t, i) => '<li class="choice' + (state.picked.indexOf(i) > -1 ? " on" : "") +
          '" data-i="' + i + '"><span class="' + (multi ? "check" : "radio") + '"></span><div>' + t + "</div></li>").join("") + "</ul></div>";
      math(box);
      box.querySelectorAll(".choice").forEach(li => li.onclick = () => {
        const i = +li.dataset.i;
        if (multi) { const k = state.picked.indexOf(i); k > -1 ? state.picked.splice(k, 1) : state.picked.push(i); }
        else state.picked = [i];
        store(p, state); draw();
      });
    }
    draw();

    return {
      reset() { localStorage.removeItem(KEY(p)); state = { picked: [] }; draw(); },
      async grade() {
        const ok = sameSet(state.picked, answer);
        const n = ok ? tries(p) : bumpTries(p);
        let html = ok ? explainBox(p) : "";
        let msg = ok ? "" : "ยังไม่ถูก";
        if (!ok && multi && n >= hintAfter()) {
          const right = state.picked.filter(i => answer.indexOf(i) > -1).length;
          msg += " — ที่เลือกไว้ถูก " + right + " ข้อ และคำตอบมีทั้งหมด " + answer.length + " ข้อ";
        }
        html += hintBox(p, n);
        return { ok, score: ok ? 1 : 0, total: 1, message: msg, html, answer: state };
      }
    };
  }

  /* ================================================================ axioms */
  function renderAxioms(p, box, ctx) {
    const spec = p.spec || {};
    const items = spec.items || [];
    let state = load(p) || { marks: {}, values: {}, verdict: undefined };
    let result = null;                       // id -> {ok, note}, plus verdictOk

    function draw() {
      const rows = items.map(it => {
        const m = state.marks[it.id];
        const r = result && result[it.id];
        const vars = (it.vars || []);
        const inputs = m === "fails" ? '<div class="counter">' +
          '<span class="lbl">ตัวอย่างค้าน:</span>' + vars.map(v =>
            '<label>' + (window.katex ? window.katex.renderToString(v, { throwOnError: false }) : v) + ' = <input type="text" data-var="' + esc(v) +
            '" value="' + esc((state.values[it.id] || {})[v] || "") + '" placeholder="' +
            ((it.scalars || []).indexOf(v) > -1 ? "เช่น 2" : "เช่น (1, 2)") + '"></label>').join("") + "</div>" : "";
        return '<div class="axiom' + (r && r.ok !== undefined ? (r.ok ? " ok" : " no") : "") + '" data-id="' + esc(it.id) + '">' +
          '<div class="ax-head"><b>' + esc(it.id) + '</b><div class="ax-txt">' + it.label + "</div>" +
          '<div class="ax-pick"><button class="pick' + (m === "holds" ? " on" : "") + '" data-mark="holds">ผ่าน</button>' +
          '<button class="pick' + (m === "fails" ? " on bad" : "") + '" data-mark="fails">ไม่ผ่าน</button></div></div>' +
          inputs + (r && r.note ? '<div class="ax-note">' + esc(r.note) + "</div>" : "") + "</div>";
      }).join("");
      box.innerHTML = '<div class="axioms">' +
        '<p class="lead">' + (spec.var_hint || "ตัดสินทีละสัจพจน์ ถ้าตอบว่า <b>ไม่ผ่าน</b> ต้องให้ตัวอย่างค้าน (counterexample) เป็นตัวเลข เช่น เวกเตอร์ <code>(1, 2)</code> เมทริกซ์ <code>[[1,0],[0,1]]</code> สเกลาร์ <code>2</code> — เว็บจะคำนวณตรวจว่าละเมิดจริง") + "</p>" +
        rows +
        '<div class="verdict' + (result && result.verdictOk !== undefined ? (result.verdictOk ? " ok" : " no") : "") + '"><b>สรุป:</b> ' + (spec.verdict_label || "$V$ เป็น vector space หรือไม่?") +
        ' <button class="pick' + (state.verdict === true ? " on" : "") + '" data-v="1">เป็น</button>' +
        '<button class="pick' + (state.verdict === false ? " on bad" : "") + '" data-v="0">ไม่เป็น</button></div></div>';
      math(box);
      box.querySelectorAll(".axiom .pick").forEach(bt => bt.onclick = () => {
        const id = bt.closest(".axiom").dataset.id;
        state.marks[id] = bt.dataset.mark; result = null; store(p, state); draw();
      });
      box.querySelectorAll(".verdict .pick").forEach(bt => bt.onclick = () => {
        state.verdict = bt.dataset.v === "1"; result = null; store(p, state); draw();
      });
      box.querySelectorAll(".counter input").forEach(inp => inp.oninput = () => {
        const id = inp.closest(".axiom").dataset.id;
        state.values[id] = state.values[id] || {};
        state.values[id][inp.dataset.var] = inp.value; store(p, state);
      });
    }
    draw();

    return {
      reset() { localStorage.removeItem(KEY(p)); state = { marks: {}, values: {}, verdict: undefined }; result = null; draw(); },
      async grade() {
        const py = await ctx.python(ctx.say);
        await ctx.prepare(py, "import numpy\n" + (spec.setup || ""), ctx.say);
        ctx.say("กำลังตรวจตัวอย่างค้าน…");
        const answers = {};
        items.forEach(it => { answers[it.id] = { mark: state.marks[it.id], values: state.values[it.id] || {} }; });
        const fn = py.globals.get("_la_axioms");
        const raw = fn(spec.setup || "", JSON.stringify(items), JSON.stringify(answers));
        fn.destroy && fn.destroy();
        const out = JSON.parse(raw);
        ctx.say("");
        if (out.error) throw new Error(out.error);

        let score = 0;
        const perItem = {};
        out.items.forEach(r => {
          const itemOk = r.mark_ok && (answers[r.id].mark !== "fails" || r.counter_ok === true);
          perItem[r.id] = { ok: itemOk, note: r.note };
          if (itemOk) score++;
        });
        const verdictOk = state.verdict === spec.verdict;
        if (verdictOk) score++;
        const total = items.length + 1;
        const ok = score === total;
        const n = ok ? tries(p) : bumpTries(p);

        /* early tries: only counts + the notes about counterexamples, so the
           answer cannot be found by flipping buttons; later: mark each row */
        const reveal = ok || n >= hintAfter();
        result = { verdictOk: reveal ? verdictOk : undefined };
        items.forEach(it => {
          const r = perItem[it.id];
          result[it.id] = reveal ? r : { ok: undefined, note: (answers[it.id].mark === "fails" ? r.note : "") };
        });
        draw();
        const wrongMarks = items.filter(it => !perItem[it.id].ok).length;
        let msg = ok ? "" : ("ตัดสินสัจพจน์ถูก " + (items.length - wrongMarks) + " จาก " + items.length + " ข้อ" +
                             (verdictOk ? "" : " · ข้อสรุปยังไม่ถูก"));
        let html = ok ? explainBox(p) : "";
        html += hintBox(p, n);
        return { ok, score, total, message: msg, html, answer: state };
      }
    };
  }

  const RENDER = { order: renderOrder, cloze: renderCloze, spot: renderSpot, mcq: renderMcq, axioms: renderAxioms };

  window.LAQ = {
    types: Object.keys(RENDER),
    render(p, container, ctx) {
      const f = RENDER[p.type];
      if (!f) {
        container.innerHTML = '<div class="note">ไม่รู้จักชนิดโจทย์ "' + esc(p.type) + '"</div>';
        return { grade: async () => ({ ok: false, score: 0, total: 1, message: "ชนิดโจทย์ไม่ถูกต้อง", answer: null }), reset() {} };
      }
      return f(p, container, ctx);
    }
  };
})();
