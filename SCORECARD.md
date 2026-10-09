# OWASP LLM Top-10 — coverage scorecard

The [OWASP Top 10 for LLM Applications (2025)](https://genai.owasp.org/llm-top-10/) is the field's
shared risk taxonomy. This is an honest map of which units exercise each category — with a
dedicated lab, partially, or not yet. No inflation: where coverage is thin, it says so.

**All 10 have a dedicated, hands-on lab — the full OWASP LLM Top-10, each with a measured number.**

| OWASP (2025) | Coverage | Units | What the lab measures |
|---|---|---|---|
| **LLM01 Prompt Injection** | ✅ dedicated | 01, 03, 05, 06, 07, 18 | direct + automated (PAIR/TAP) + multi-turn + indirect + multimodal ASR |
| **LLM02 Sensitive Information Disclosure** | ✅ dedicated | 19, 01 | extraction rate, membership-inference AUC, model-stealing agreement |
| **LLM03 Supply Chain** | ✅ dedicated | 22, 24 | poisoned/rug-pull/typosquat MCP servers flagged; weight-poisoning (pickle) demo |
| **LLM04 Data and Model Poisoning** | ✅ dedicated | 13, 17 | fine-tune backdoor/poison deltas; RAG retrieval-poisoning landing rate |
| **LLM05 Improper Output Handling** | ✅ dedicated | 08, 24 | synthetic model-output probes measure local-only SSRF canary reach, SQL injection row count, and an unescaped script-markup sink; each has a paired mitigation |
| **LLM06 Excessive Agency** | ✅ dedicated | 08, 09, 23 | unauthorized-tool-call rate; multi-agent propagation; computer-use ASR |
| **LLM07 System Prompt Leakage** | ✅ dedicated | 01, 03 | the vault lab = a secret in a system prompt; leak rate across attacks |
| **LLM08 Vector and Embedding Weaknesses** | ✅ dedicated | 17 | poisoned-chunk top-k landing rate; embedding-inversion curve |
| **LLM09 Misinformation** | ✅ dedicated | 10, 25 | hallucination rate + overreliance/sycophancy rate vs a fixed ground-truth set |
| **LLM10 Unbounded Consumption** | ✅ dedicated | 24 | crafted-request cost-amplification factor (×) |

✅ dedicated = at least one unit's lab produces a measured number for this category.
◑ partial = the mechanism is touched but there's no standalone lab yet.

## Also covered (beyond the Top-10)

- **Defense & auditing** — units 04 (benchmarks/garak/promptfoo), 10 (Inspect + Petri), 15 (circuit breakers / TAR).
- **Model-side attacks** — units 11–14 (SFT/LoRA, refusal-direction ablation, fine-tune attacks, DPO + gradient).
- **Classical grounding & interpretability** — units 20 (FGSM/PGD, ART), 21 (mech-interp as an attack tool).
- **Governance & reporting** — unit 25 maps every finding to OWASP LLM / MITRE ATLAS / NIST AI RMF and scores it with AIVSS.
- **Practice & career** — unit 26 (CTF gauntlet, cert landscape, portfolio).

Each unit also carries a **MITRE ATLAS** tactic/technique tag in its mechanism beat.

## Bounded by design

- **LLM05** (Unit 24): the output-handling range reaches only its own loopback listener, uses an
  in-memory SQL database, and inspects injected script markup without executing browser JavaScript.
- **LLM09** (Unit 10): the misinformation lab uses general-knowledge facts and a fixed ground-truth
  set — benign content only, measuring hallucination and sycophancy rates, never producing harm.

*2025 edition. OWASP revises this list; re-check [genai.owasp.org/llm-top-10](https://genai.owasp.org/llm-top-10/) before citing it in a report.*
