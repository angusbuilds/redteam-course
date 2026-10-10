# Changelog

All notable changes to this course. Dates are absolute.

## [0.2.0] — 2026-10-09

**All 27 units, brand-new to expert.** Two new phases wrap the ladder: Phase 0
(Foundations) and Phase F (the expert track).

### Added
- **Phase 0 — Foundations** (unit 00): the mental model, the one rule, and ten attacks tagged by OWASP category before Unit 1.
- **Phase F — The Expert Track** (units 17–26): RAG & vector-store poisoning · multimodal jailbreaks · training-data extraction and model stealing · classical adversarial ML (FGSM/PGD via ART) · mech-interp attack surface · MCP supply-chain audits · computer-use agent ranges · output handling & unbounded consumption · governance and disclosure · CTF gauntlet + careers. Each ships the same seven beats and a lab that prints one number.
- **OWASP LLM Top-10 coverage: 10/10 dedicated** — the LLM05 output-handling lab (unit 24: SQL/XSS/SSRF sinks on a local range) and the unit 10 misinformation lab close the last two gaps. See SCORECARD.md.
- **AgentDojo benchmark lab** (unit 07) alongside the injection lab.
- **Shareable proof cards** — every lab's number can be exported as a card.
- **Arsenal: Pliny's toolkit** — L1B3RT4S, 0BL1T3R4TUS, CL4R1T4S, T3MP3ST, P4RS3LT0NGV3, BASILISK and friends mapped to their units.
- **CI gates on every push/PR** — link validation plus a headless render gate (zero console errors) via `scripts/verify.mjs`; OG preview image.

### Changed
- **Rigor pass on every ASR/refusal lab** — N ≥ 30 trials, dual-judge disagreement reported alongside the number, rubric scoring instead of substring matching.
- Home page renders the full 27-unit ladder (was 16).
- Unit 24 retitled to match its scope: Output Handling, Unbounded Consumption & Supply Chain.
- **Every unit's mechanism beat now ends with its MITRE ATLAS technique IDs** (real `AML.T…` codes
  from the current matrix — LLM Prompt Injection `AML.T0051`, RAG Poisoning `AML.T0070`, AI Supply
  Chain Rug Pull `AML.T0109`, …) alongside the OWASP category, so findings ship in the vocabulary
  reports expect. Unit 00 introduces the tagging scheme.

### Added (CI & delivery)
- **`labs/unit01-vault-substrates.sh`** — the Unit 1 vaults re-run on any local model
  (`MODEL=… N=3`): same guard text, different brain. Measured on llama3.2:1b: the hardened
  vaults that a frontier model holds leak at small scale — through completion pressure *and*
  through refusals that quote the secret they deny. Guard strength tracks substrate capability.
- **`scripts/check-content.mjs` — a structural gate**: every unit complete (7 beats, 3 drills with
  answers, sources with URLs), every referenced lab on disk, every lab script parseable, home ladder
  in sync with the unit dirs, and an ATLAS ID in every mechanism beat. Runs in CI before the render
  gate. Verified to catch breakage (negative-tested against a thinned drill set).
- **GitHub Pages deployment** — every green push to `main` deploys the course to
  https://angusbuilds.github.io/redteam-course/. `verify.mjs` is now subpath-aware (verified
  against a `/redteam-course/` prefix locally before shipping).
- **Social preview** — OpenGraph/Twitter meta and a canonical URL on the home page; README links
  the live site.

## [0.1.0] — 2026-10-08

The first full release: **all 16 units, zero to first paid finding.**

### Added
- **16 units across 5 phases** (A Get in the game · B Measure like a pro · C Attack the agents · D Own the model · E Get paid), each with an interactive explorable, three drills, a lab that prints one number, and pinned primary sources.
- **Unit 1 vault lab** — a self-contained three-vault harness over the `claude` CLI; the misconfigured vault reliably leaks, the two hardened ones hold (1/3).
- **The engine** — a dyslexia-tuned 7-beat format, headless render gate (`verify.mjs`), and a filesystem-based link checker.
- **Home page** — the 16-unit ladder, a dated bounty-venue scorecard, and cross-links to the sibling courses.
- **Repo** — README (hero, badges, arsenal), LICENSE (MIT), SECURITY, CONTRIBUTING, Code of Conduct.

### How it was built
- Designed and premortem-hardened by a multi-agent Claude research workflow; units built in parallel off a verified Unit 1 stencil.
- Audited twice by Codex (engine stencil + all 16 units); every real finding fixed, including replacing a working SQL-injection string with a shape-only placeholder and making labs score failed model calls as inconclusive rather than as successes.
- Visual identity generated with Higgsfield.

### Verified
- All 17 pages pass the headless gate with zero console errors; all 16 lab scripts parse; every link resolves.
