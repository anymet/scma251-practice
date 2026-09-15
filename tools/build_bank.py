#!/usr/bin/env python3
"""
Assemble the problem bank.

    python tools/build_bank.py            # -> assets/problem_bank.json  +  bank/solutions.json

Every file bank/sNN.py describes one section: it must define WEEK (dict),
PROBLEMS (list of dicts) and SOLUTIONS (dict slug -> reference solution for
code problems / samples+counter for axioms problems).  Writing the problems in
Python instead of raw JSON keeps the LaTeX readable (no double escaping of
quotes) and lets one section share helper text between problems.

The reference solutions are written to bank/solutions.json, which is NOT
uploaded to the website - keep it out of the public folder if you host the
bank file somewhere students can see it.
"""
import glob, importlib.util, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
weeks, problems, solutions = [], [], {}

for path in sorted(glob.glob(os.path.join(ROOT, "bank", "s*.py"))):
    name = os.path.splitext(os.path.basename(path))[0]
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    weeks.append(mod.WEEK)
    problems.extend(mod.PROBLEMS)
    solutions.update(mod.SOLUTIONS)
    print("%-8s %2d problems" % (name, len(mod.PROBLEMS)))

# every section that has no bank file yet still gets its card, closed
import re
seed = open(os.path.join(ROOT, "sql", "02_seed_sections.sql"), encoding="utf-8").read()
known = {w["week_no"] for w in weeks}
for m in re.finditer(r"\(\s*(\d+),\s*(\d+),\s*'([^']*)',\s*(\d+),\s*'([^']*)',\s*'([^']*)',\s*(\d+),\s*(true|false)\)", seed):
    no = int(m.group(1))
    if no not in known:
        weeks.append({"week_no": no, "display_no": int(m.group(2)), "label": m.group(3), "chapter": int(m.group(4)),
                      "title": m.group(5), "subtitle": m.group(6), "sort_order": int(m.group(7)), "is_open": False})
weeks.sort(key=lambda w: w["sort_order"])

out = os.path.join(ROOT, "assets", "problem_bank.json")
json.dump({"weeks": weeks, "problems": problems}, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump(solutions, open(os.path.join(ROOT, "bank", "solutions.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("wrote %s  (%d sections, %d problems)" % (os.path.relpath(out, ROOT), len(weeks), len(problems)))
