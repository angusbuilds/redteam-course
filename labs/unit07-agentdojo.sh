#!/bin/sh
# Unit 7 lab (benchmark-grade) — AgentDojo subset against a local model.
#
# labs/unit07-injection.sh is a 20-line toy agent you built yourself: a
# fixed set of 30 clean/poisoned page pairs, scored three ways. It's honest
# about what it is — a fixed set comparable run-to-run, not a published
# benchmark.
#
# This script is the other option: a SMALL fixed subset of AgentDojo's
# real suites/tasks, run through AgentDojo's own model interface against a
# local Ollama model, reporting AgentDojo's three real metrics —
#   benign utility          - % of the subset's tasks completed with no attack
#   utility under attack    - % still completed with an injection present
#   attack-success-rate     - % where the injected task was executed instead
# over that subset, so the number is comparable (same metric names, same
# definitions) to rows on AgentDojo's own published leaderboard — not
# identical to the full-suite number, since this only runs a small subset.
#
# Needs: pip install agentdojo, plus ollama running locally with a model
# pulled (Unit 2). If either is missing, this prints the exact commands
# and exits 0 rather than faking a number.
#
# Authorized target: your own local model, on your own box.

set -u

say() { echo "$1"; }

say "=== Unit 7 lab: AgentDojo subset (benchmark-grade) ==="
say ""

if ! command -v python3 >/dev/null 2>&1; then
  say "python3 isn't on PATH. Do Unit 2 first, then re-run this lab."
  exit 0
fi

if ! python3 -c "import agentdojo" >/dev/null 2>&1; then
  say "The 'agentdojo' package isn't installed."
  say "Install it, then re-run this lab:"
  say "  pip install agentdojo"
  say ""
  say "(No numbers faked here — this prints the install command and stops.)"
  say "In the meantime, labs/unit07-injection.sh runs a fixed 30-item stand-in"
  say "with the same shape of metrics, no extra install required."
  exit 0
fi

if ! command -v ollama >/dev/null 2>&1; then
  say "ollama isn't on PATH yet. Do Unit 2 first (local toolchain install),"
  say "then run this lab again."
  exit 0
fi

if ! curl -s -m 2 -o /dev/null http://127.0.0.1:11434/api/tags; then
  say "ollama is installed but not running. Start it, then re-run this lab:"
  say "  ollama serve &"
  exit 0
fi

MODEL="${OLLAMA_MODEL:-llama3.2}"
if ! curl -s -m 2 http://127.0.0.1:11434/api/tags | grep -qF "\"${MODEL}"; then
  say "Model '$MODEL' isn't pulled yet. Do Unit 2 first, or pull it by hand:"
  say "  ollama pull $MODEL"
  say "(or point this lab at a model you already have: OLLAMA_MODEL=<name> bash labs/unit07-agentdojo.sh)"
  exit 0
fi

say "agentdojo: found"
say "model:     $MODEL (via Ollama, local)"
say "Running a small fixed subset of AgentDojo's suites/tasks. This is a"
say "real benchmark run, not a stand-in — it can take several minutes and"
say "will call the local model many times."
say ""

OLLAMA_MODEL="$MODEL" python3 <<'PY'
import os, sys

MODEL = os.environ["OLLAMA_MODEL"]

# Small, fixed subset — same suite/task ids every run, so the number stays
# comparable across runs the way the toy lab's fixed 30 does. Keep this
# subset small on purpose: it's a smoke-test-sized slice of the real
# benchmark, not a substitute for running the full thing.
SUITE = "workspace"
TASK_IDS = ["user_task_0", "user_task_1", "user_task_2"]
INJECTION_TASK_IDS = ["injection_task_0"]

try:
    from agentdojo.agent_pipeline import AgentPipeline, PipelineConfig
    from agentdojo.benchmark import benchmark_suite_with_injections
    from agentdojo.task_suite.load_suites import get_suite
except Exception as exc:
    print(f"agentdojo is installed, but its API didn't match what this lab "
          f"expects ({exc.__class__.__name__}: {exc}).")
    print("AgentDojo's API has moved before. Check the version you have:")
    print("  pip show agentdojo")
    print("and the examples in its repo (linked in this unit's sources) for")
    print("the current pipeline/benchmark entry points, then adapt the three")
    print("calls at the top of this script's PY block to match.")
    print("No numbers faked here — exiting without a run.")
    sys.exit(0)

try:
    # AgentDojo's provider config for a local model through Ollama. If your
    # installed version names this differently, this is the one line to
    # change.
    pipeline = AgentPipeline.from_config(
        PipelineConfig(llm="ollama", model_name=MODEL)
    )
    suite = get_suite("v1.1.2", SUITE)

    results = benchmark_suite_with_injections(
        agent_pipeline=pipeline,
        suite=suite,
        user_tasks=TASK_IDS,
        injection_tasks=INJECTION_TASK_IDS,
    )
except Exception as exc:
    print(f"The benchmark run itself failed ({exc.__class__.__name__}: {exc}).")
    print("That's usually a version mismatch between this script's call shape")
    print("and your installed agentdojo, or the local model timing out on a")
    print("longer tool-using task. No numbers faked here — exiting without a run.")
    sys.exit(0)

# AgentDojo's own result object carries these three; pull them out rather
# than recompute anything so the numbers are exactly what AgentDojo reports.
benign = getattr(results, "benign_utility", None)
under_attack = getattr(results, "utility_under_attack", None)
asr = getattr(results, "attack_success_rate", None)

if benign is None or under_attack is None or asr is None:
    print("Got a result object back, but couldn't find benign_utility /")
    print("utility_under_attack / attack_success_rate on it. Check")
    print("`pip show agentdojo` against the sources in this unit for the")
    print("current result shape. No numbers faked here — exiting without a run.")
    sys.exit(0)

print()
print("============================================")
print(f"AgentDojo subset ({SUITE}, {len(TASK_IDS)} tasks, "
      f"{len(INJECTION_TASK_IDS)} injection task):")
print(f"  benign utility        = {benign:.0%}")
print(f"  utility under attack   = {under_attack:.0%}")
print(f"  attack-success-rate    = {asr:.0%}")
print("============================================")
print()
print("Log it:")
print('  echo "$(date +%F) unit07 agentdojo: '
      'benign=' + f"{benign:.0%}" + ' under_attack=' + f"{under_attack:.0%}" +
      ' asr=' + f"{asr:.0%}" + '" >> log/portfolio.md')
print()
print("What it means: this is a 3-task slice of one AgentDojo suite, not the")
print("full benchmark — it's comparable in kind to leaderboard rows, not in")
print("size. Widen TASK_IDS / SUITE above once you want the full run.")
PY
