<div align="center">
  <img src="assets/hero-sphere.png" alt="Breaking Models — the arsenal" width="80%">
</div>

# The Arsenal

Every open-source tool, benchmark, and reading the course puts in your hands — mapped to the unit
that uses it, with a note on whether it runs on your Mac. Pulled from the strongest, most-current
repos in AI red-teaming (star counts as of October 2026).

> **Spine:** every technique in the course maps to a tactic in [MITRE ATLAS](https://github.com/mitre-atlas/atlas-data) —
> the ATT&CK-style matrix for attacks on AI systems. When you write a finding, tag it with its ATLAS ID.
> It's the vocabulary labs and reports expect.

---

## Phase A — Get in the game

| Tool | ★ | Unit | What you do with it | Mac |
|------|---|------|---------------------|-----|
| [L1B3RT4S](https://github.com/elder-plinius/L1B3RT4S) | 21.7k | 3 | Pliny's library of jailbreak *shapes* — study structure, not payloads | ✅ text |
| [Prompt-Hacking-Resources](https://github.com/PromptLabs/Prompt-Hacking-Resources) | 733 | 3 | a curated index of technique writeups | ✅ |
| [Lakera Gandalf](https://gandalf.lakera.ai) | — | 1 | the browser game that makes the mental model click | ✅ |
| [awesome-llm-security](https://github.com/corca-ai/awesome-llm-security) | 1.7k | 1 | the field, one link at a time | ✅ |

## Phase B — Measure like a pro

| Tool | ★ | Unit | What you do with it | Mac |
|------|---|------|---------------------|-----|
| [garak](https://github.com/NVIDIA/garak) | 9.5k | 4 | NVIDIA's LLM vuln scanner — point it at local Ollama, ship the HTML report | ✅ |
| [promptfoo](https://github.com/promptfoo/promptfoo) | 22.4k | 4 | the eval harness that drives your local models | ✅ |
| [giskard](https://github.com/Giskard-AI/giskard-oss) | 5.9k | 4 | scan for a broad class of LLM failures | ✅ |
| [JailbreakBench](https://github.com/JailbreakBench/jailbreakbench) | 687 | 4 | the shared behavior set + judge, so your ASR means what the papers mean | ✅ |
| [HarmBench](https://github.com/centerforaisafety/HarmBench) | 1.1k | 4 | compare 18 attack methods against one target through one config | ◑ black-box ✅ |
| [StrongREJECT](https://github.com/alexandrasouly/strongreject) | 161 | 4 | an autograder that resists over-counting | ✅ |
| [PAIR (JailbreakingLLMs)](https://github.com/patrickrchao/JailbreakingLLMs) | 793 | 5 | clone it, point both attacker and target at local Ollama | ✅ |
| [TAP](https://github.com/RICommunity/TAP) | 242 | 5 | the tree-of-attacks upgrade to PAIR | ✅ |
| [EasyJailbreak](https://github.com/EasyJailbreak/EasyJailbreak) | 871 | 5 | attacks as swappable Seeder/Mutator/Evaluator Lego | ✅ MPS |
| [PyRIT](https://github.com/microsoft/PyRIT) | 4.6k | 5 | Microsoft's attack framework (ships TAP) | ✅ |
| [GPTFuzz](https://github.com/sherdencooper/GPTFuzz) | 597 | 6 | coverage-guided *fuzzing* of your Unit-3 seeds | ✅ |
| [spikee](https://github.com/ReversecLabs/spikee) | 239 | 6 | a prompt-injection toolkit | ✅ |
| [nanoGCG](https://github.com/GraySwanAI/nanoGCG) | 354 | 5/14 | the readable gradient attack — **the one cloud-GPU exception** | ❌ CUDA |

## Phase C — Attack the agents *(your thesis)*

| Tool | ★ | Unit | What you do with it | Mac |
|------|---|------|---------------------|-----|
| [AgentDojo](https://github.com/ethz-spylab/agentdojo) | 898 | 7 | the injection benchmark for tool-using agents | ✅ |
| [InjecAgent](https://github.com/uiuc-kang-lab/InjecAgent) | 172 | 7 | a second injection benchmark to cross-check | ✅ |
| [mcp-injection-experiments](https://github.com/invariantlabs-ai/mcp-injection-experiments) | PoC | 8 | working tool-poisoning / rug-pull demos | ✅ |
| [agent-scan](https://github.com/snyk/agent-scan) | 3.1k | 8 | scan installed MCP servers for poisoned descriptions | ✅ |
| [Decepticon](https://github.com/BitterSecurity/Decepticon) | 5.7k | 9 | the production-shaped autonomous multi-agent red-team — the exemplar you study | ◑ Docker |
| [agentic_security](https://github.com/msoedov/agentic_security) | 2.0k | 4 | an agent-focused scanner | ✅ |

## Phase C/D — Audit & defend

| Tool | ★ | Unit | What you do with it | Mac |
|------|---|------|---------------------|-----|
| [Inspect](https://github.com/UKGovernmentBEIS/inspect_ai) | 3.0k | 10 | the eval framework the labs publish with (Ollama provider) | ✅ |
| [inspect_evals](https://github.com/UKGovernmentBEIS/inspect_evals) | 696 | 4/10 | 170+ ready benchmarks on top of Inspect | ✅ |
| [Petri](https://github.com/safety-research/petri) | 1.4k | 10 | Anthropic's automated auditing agent + judge | ✅ |
| [lm-evaluation-harness](https://github.com/EleutherAI/lm-evaluation-harness) | 14.2k | 4/10 | the standard eval runner, MPS-ok for small models | ✅ |
| [circuit-breakers](https://github.com/GraySwanAI/circuit-breakers) | 270 | 15 | the defense you re-attack and measure the effort to beat | ◑ |
| [Tamper-Resistance (TAR)](https://github.com/rishub-tamirisa/tamper-resistance) | 71 | 15 | safeguards built to survive fine-tuning attacks | ❌ CUDA |
| [LLM Guard](https://github.com/protectai/llm-guard) | 3.2k | 15 | an input/output filter to probe and bypass | ✅ |
| [NeMo Guardrails](https://github.com/NVIDIA-NeMo/Guardrails) | 7.3k | 15 | config-driven guardrails to test against | ✅ |

## Phase D — Own the model

| Tool | ★ | Unit | What you do with it | Mac |
|------|---|------|---------------------|-----|
| [mlx-lm](https://github.com/ml-explore/mlx-lm) | — | 11 | fine-tune on Apple Silicon (LoRA/QLoRA) | ✅ MLX |
| [mlx-lm-lora](https://github.com/Goekdeniz-Guelmez/mlx-lm-lora) | — | 14 | adds DPO/ORPO/GRPO on top | ✅ MLX |
| [peft](https://github.com/huggingface/peft) | — | 11 | the adapter math, MPS-ok | ✅ MPS |
| [trl](https://github.com/huggingface/trl) | — | 14 | SFT/DPO trainers, MPS-ok without quant | ✅ MPS |
| [heretic](https://github.com/p-e-w/heretic) | 28k | 12 | **fully automatic abliteration** — refusal-rate/KL co-minimization; the current state of the art | ◑ |
| [FailSpy/abliterator](https://github.com/FailSpy/abliterator) | — | 12 | the hands-on refusal-ablation toolkit, MPS-ok to ~8B | ✅ MPS |
| [refusal_direction](https://github.com/andyrdt/refusal_direction) | — | 12 | the reference code for the Arditi et al. paper | ✅ MPS |
| [TransformerLens](https://github.com/TransformerLensOrg/TransformerLens) | — | 12 | read and edit activations | ✅ MPS |
| [representation-engineering](https://github.com/andyzoujm/representation-engineering) | — | 12 | the RepE toolkit behind circuit breakers | ✅ MPS |
| [emergent-misalignment](https://github.com/emergent-misalignment/emergent-misalignment) | — | 13 | insecure-code → broad misalignment, with the eval | ✅ eval |
| [unsloth](https://github.com/unslothai/unsloth) | — | 13 | fast fine-tuning (CUDA) — the cloud option | ❌ CUDA |

## Phase E — Get paid

| Resource | Unit | What you do with it |
|----------|------|---------------------|
| [OWASP Top 10 for LLM Apps](https://genai.owasp.org/llm-top-10/) | 16 | the taxonomy triagers think in |
| [HackAPrompt](https://www.hackaprompt.com/) | 16 | a beginner-friendly competition + the 600k-attempt dataset |
| [MITRE ATLAS](https://github.com/mitre-atlas/atlas-data) | all | tag every finding with its ATLAS technique ID |

Mac column: ✅ runs on a 48 GB Apple-Silicon Mac · ◑ runs with caveats (Docker, slow, or small models only) · ❌ needs CUDA / a cloud GPU.

---

## Where this goes next

Candidate units pulled from the survey, not yet built:

- **Unit 6.5 · Automated Attack Synthesis** — compose attacks from primitives with [h4rm3l](https://github.com/mdoumbouya/h4rm3l)'s DSL + bandit search.
- **Unit 8.5 · MCP / Agent Supply-Chain Audit** — scan your installed MCP servers with `agent-scan` before you ever run them.
- **CTF Gauntlet** (before Unit 16) — a difficulty-ramped set of real DEF CON AI Village challenges.
- **Capstone · Decensor-and-Detect** — one side plants a backdoor (sleeper-agent style), the other has to find it with the auditing tools from Unit 10.
