#!/usr/bin/env python3
"""
Check assets/problem_bank.json before importing it.

    python tools/validate_bank.py                 # whole bank
    python tools/validate_bank.py --section 21    # one section

What is checked
  * every problem: slug unique, week_no is a known section, type known
  * code problems: the reference solution in bank/solutions.json passes every
    test under the SAME harness the browser uses (taken from section.html);
    the starter code must NOT pass (otherwise the problem is free)
  * order: ids unique, deps acyclic, the given solution respects the deps
  * cloze / spot / mcq: indices in range
  * axioms: the setup runs; for every axiom that "holds" the check is True on
    the sample values in bank/solutions.json; for every axiom that "fails" the
    counterexample in bank/solutions.json is accepted by _la_axioms
Exit code 1 when anything fails.
"""
import json, re, sys, os, argparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BANK = os.path.join(ROOT, "assets", "problem_bank.json")
SOLS = os.path.join(ROOT, "bank", "solutions.json")
PAGE = os.path.join(ROOT, "section.html")

TYPES = {"code", "order", "cloze", "spot", "mcq", "axioms"}


def load_harness():
    html = open(PAGE, encoding="utf-8").read()
    m = re.search(r'<script type="text/x-python" id="harness">([\s\S]*?)</script>', html)
    ns = {}
    exec(compile(m.group(1), "<harness>", "exec"), ns)
    return ns


def check_order(spec, err):
    ids = [b["id"] for b in spec.get("blocks", [])] + [d["id"] for d in spec.get("distractors", [])]
    if len(set(ids)) != len(ids):
        err("duplicate block ids")
    blocks = [b["id"] for b in spec.get("blocks", [])]
    if not blocks:
        err("no blocks"); return
    sol = spec.get("solution") or blocks
    if sorted(sol) != sorted(blocks):
        err("solution must list exactly the non-distractor blocks")
    deps = spec.get("deps") or [[sol[i], sol[i + 1]] for i in range(len(sol) - 1)]
    pos = {b: i for i, b in enumerate(sol)}
    for a, b in deps:
        if a not in pos or b not in pos:
            err("dependency %r names a distractor or unknown block" % ([a, b],))
        elif pos[a] >= pos[b]:
            err("solution violates dependency %s -> %s" % (a, b))
    # every block should be constrained somehow, or the puzzle is loose
    loose = [b for b in blocks if not any(b in d for d in deps)]
    if loose and len(blocks) > 1:
        err("blocks with no dependency at all (any position passes): %s" % loose)
    for d in spec.get("distractors", []):
        if not d.get("why"):
            err("distractor %s has no 'why' (students see it after solving)" % d["id"])


def check_cloze(spec, err):
    used = re.findall(r"\{\{\s*([^}\s]+)\s*\}\}", spec.get("text", ""))
    if not used:
        err("no {{n}} gaps in text")
    for gid in used:
        b = spec.get("blanks", {}).get(gid)
        if not b:
            err("gap {{%s}} has no entry in blanks" % gid); continue
        if not isinstance(b.get("answer"), int) or not (0 <= b["answer"] < len(b.get("choices", []))):
            err("gap {{%s}} bad answer index" % gid)
        if len(b.get("choices", [])) < 2:
            err("gap {{%s}} needs at least 2 choices" % gid)
    for gid in spec.get("blanks", {}):
        if gid not in used:
            err("blank %s is defined but never used in text" % gid)


def check_spot(spec, err):
    n, m = len(spec.get("lines", [])), len(spec.get("reasons", []))
    if not (isinstance(spec.get("wrong"), int) and 0 <= spec["wrong"] < n):
        err("bad 'wrong' index")
    if not (isinstance(spec.get("reason_answer"), int) and 0 <= spec["reason_answer"] < m):
        err("bad 'reason_answer' index")


def check_mcq(spec, err):
    ans = spec.get("answer")
    ans = ans if isinstance(ans, list) else [ans]
    n = len(spec.get("choices", []))
    if not ans or any(not isinstance(a, int) or not (0 <= a < n) for a in ans):
        err("bad answer indices")
    if len(ans) > 1 and not spec.get("multi"):
        err("several answers but multi is not true")


def check_axioms(spec, sol, harness, err, warn):
    import numpy as np
    ns = {"np": np, "allclose": np.allclose,
          "eq": lambda a, b: bool(np.allclose(np.asarray(a, dtype=float), np.asarray(b, dtype=float)))}
    try:
        exec(compile(spec.get("setup", ""), "<setup>", "exec"), ns)
    except Exception as e:
        err("setup fails: %s: %s" % (type(e).__name__, e)); return
    if not callable(ns.get("in_set")):
        warn("setup defines no in_set(u) - membership of counterexamples will not be checked")
    if not sol:
        err("no entry in bank/solutions.json (needs samples / counter)"); return
    samples = sol.get("samples", {})
    literal = harness["_la_literal"]
    items = spec.get("items", [])
    if not isinstance(spec.get("verdict"), bool):
        err("verdict must be true/false")
    if spec.get("verdict") != all(it.get("holds") for it in items):
        err("verdict does not agree with the items (all hold <=> vector space)")
    answers = {}
    for it in items:
        for k in ("id", "label", "holds", "check"):
            if k not in it:
                err("item missing %r" % k)
        local = dict(ns)
        try:
            for v in it.get("vars", []):
                if v not in samples:
                    err("item %s uses var %s but samples has no value for it" % (it["id"], v)); raise KeyError(v)
                local[v] = literal(samples[v])
            holds = bool(eval(compile(it["check"], "<check>", "eval"), local))
        except KeyError:
            continue
        except Exception as e:
            err("item %s check fails to evaluate: %s: %s" % (it["id"], type(e).__name__, e)); continue
        if it["holds"] and not holds:
            err("item %s is marked holds=true but check is False on the samples" % it["id"])
        if not it["holds"]:
            c = (sol.get("counter") or {}).get(it["id"])
            if c is None:
                err("item %s fails but solutions.json has no counterexample" % it["id"]); continue
            answers[it["id"]] = {"mark": "fails", "values": c}
        else:
            answers[it["id"]] = {"mark": "holds", "values": {}}
    out = json.loads(harness["_la_axioms"](spec.get("setup", ""), json.dumps(items), json.dumps(answers)))
    if out.get("error"):
        err("_la_axioms: " + out["error"]); return
    for r in out["items"]:
        if not r["mark_ok"]:
            err("item %s: reference mark rejected (?)" % r["id"])
        if answers.get(r["id"], {}).get("mark") == "fails" and r["counter_ok"] is not True:
            err("item %s: reference counterexample rejected - %s" % (r["id"], r["note"]))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--section", type=int, default=None)
    args = ap.parse_args()

    bank = json.load(open(BANK, encoding="utf-8"))
    sols = json.load(open(SOLS, encoding="utf-8")) if os.path.exists(SOLS) else {}
    harness = load_harness()
    weeks = {w["week_no"]: w for w in bank.get("weeks", [])}
    problems = bank.get("problems", [])
    if args.section:
        problems = [p for p in problems if p.get("week_no") == args.section]

    failures = 0
    seen = set()
    for p in problems:
        slug = p.get("slug", "?")
        msgs = []
        def err(m): msgs.append(("ERR", m))
        def warn(m): msgs.append(("warn", m))

        if slug in seen: err("duplicate slug")
        seen.add(slug)
        if p.get("week_no") not in weeks: err("week_no %r is not in bank.weeks" % p.get("week_no"))
        t = p.get("type", "code")
        if t not in TYPES: err("unknown type %r" % t)
        for k in ("title", "statement", "level"):
            if not p.get(k): err("missing %s" % k)
        if "$" in (p.get("statement") or "") and (p["statement"].count("$") % 2): err("odd number of $ in statement")

        if t == "code":
            tests = p.get("tests") or []
            if not tests: err("no tests")
            sol = sols.get(slug)
            if not sol:
                err("no reference solution in bank/solutions.json")
            else:
                out = json.loads(harness["_scim_run"](sol, p.get("setup_code") or "", json.dumps(tests), 30))
                if out.get("error"):
                    err("solution crashed: " + out["error"])
                else:
                    for r in out["results"]:
                        if not r["ok"]:
                            err("solution fails test %s: expected %s got %s" % (r["label"], r["expected"], r["got"]))
                # the starter must not already pass
                out2 = json.loads(harness["_scim_run"](p.get("starter_code") or "", p.get("setup_code") or "", json.dumps(tests), 30))
                if not out2.get("error") and all(r["ok"] for r in out2.get("results", [])):
                    err("the STARTER code already passes every test")
        else:
            spec = p.get("spec")
            if not isinstance(spec, dict):
                err("spec missing")
            else:
                {"order": check_order, "cloze": check_cloze, "spot": check_spot, "mcq": check_mcq}.get(
                    t, lambda s, e: check_axioms(s, sols.get(slug), harness, e, warn))(spec, err)

        for kind, m in msgs:
            print("  [%s] %s: %s" % (kind, slug, m))
            if kind == "ERR": failures += 1

    by_type = {}
    for p in problems:
        by_type[p.get("type", "code")] = by_type.get(p.get("type", "code"), 0) + 1
    print("\n%d problems in %d section(s): %s" % (
        len(problems), len({p.get("week_no") for p in problems}),
        ", ".join("%s x%d" % kv for kv in sorted(by_type.items()))))
    print("OK - no errors" if not failures else "%d error(s)" % failures)
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
