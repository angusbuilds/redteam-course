# Contributing

Thanks for wanting to make the course better. The bar is simple: every change keeps the course
**runnable, measurable, and honest.**

## Ways to help

- **New or sharper units** — a better explorable, a tighter lab, a clearer mechanism.
- **Fresh venue data** — bounty scopes and payouts drift; `data/world-oct-2026.json` goes stale on purpose.
- **Better labs** — a lab that runs cleaner on a 48 GB Mac, or produces a more honest number.
- **Fixes** — a drill whose answer doesn't match its explorable, a broken link, a lab that scores a failed call as a success.

## The format (don't break it)

Each unit is five files and one lab script:

```
unitNN/index.html     # the 7-beat skeleton (copy an existing unit)
unitNN/content.json   # ALL the prose: hook, mechanism, technique, 3 drills, lab, sources
unitNN/app.js         # the explorable; imports ../shared/unit.js; calls ready() LAST
unitNN/style.css      # unit-only styles on top of shared/
labs/unitNN-<slug>.sh # the real attack; prints ONE number; degrades gracefully if a tool is missing
```

Rules that keep it readable (the learner is dyslexic + has ADHD): short lines, numbers in
columns, an interactive explorable instead of a wall of prose, and one measurable number out of
every unit.

## The gate

Before a change lands, it must pass what the whole course was built with:

```bash
node scripts/check-content.mjs                  # every unit complete, every lab parses, ladder in sync
./start.sh                                     # serve on :8901
node scripts/verify.mjs http://localhost:8901   # Chrome: all course pages, no console errors
node scripts/check-links.mjs                   # every link resolves
```

CI runs all three on every push and PR, then deploys `main` to
[GitHub Pages](https://angusbuilds.github.io/redteam-course/). `check-content.mjs` also enforces
the shape the README promises: 7 beats per unit, 3 drills each with an answer, every referenced
lab on disk, and a real MITRE ATLAS technique ID (`AML.T…`) in every mechanism beat.

No console errors, no dead links, no simulated number dressed up as a measurement. If a value is
illustrative, the UI says so.

## Authorized-only

Everything here is for authorized red-teaming. See [SECURITY.md](SECURITY.md). Shapes, not payloads.
